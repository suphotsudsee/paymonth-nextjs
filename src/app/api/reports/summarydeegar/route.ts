import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

type Row = {
  PNUMBER: string | null;
  NODEEGAR: string | null;
  MONEY: any;
  ACCNAME: string | null;
  CHEQUE: string | null;
  PAYDATE: Date | null;
  MPAYALL: any;
  BALANCE: any;
  DUPDATE: Date | null;
};

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 10)));
    const offset = (page - 1) * pageSize;

    const pnumber = searchParams.get('pnumber')?.trim();
    const cheque = searchParams.get('cheque')?.trim();
    const accname = searchParams.get('accname')?.trim();

    const filters: string[] = ["s.PNUMBER <> 'p000000000'", "d.PNUMBER <> 'p000000000'"];
    const params: any[] = [];

    if (pnumber) {
      filters.push('d.PNUMBER LIKE ?');
      params.push(`%${pnumber}%`);
    }
    if (cheque) {
      filters.push('TRIM(cheque.CHEQUE) LIKE ?');
      params.push(`%${cheque}%`);
    }
    if (accname) {
      filters.push('d.ACCNAME LIKE ?');
      params.push(`%${accname}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Paginate inside the DB at the grouped level to avoid fetching all rows.
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          agg.PNUMBER,
          agg.NODEEGAR,
          agg.MONEY,
          agg.ACCNAME,
          agg.CHEQUE,
          agg.PAYDATE,
          agg.MPAYALL,
          (agg.MONEY - agg.MPAYALL) AS BALANCE,
          agg.DUPDATE
        FROM (
          SELECT
            d.PNUMBER,
            d.NODEEGAR,
            d.MONEY,
            d.ACCNAME,
            cheque.CHEQUE,
            IF(cheque.PAYDATE LIKE '0000%', NULL, cheque.PAYDATE) AS PAYDATE,
            SUM(s.MONEY) AS MPAYALL,
            IF(d.DUPDATE LIKE '0000%', NULL, d.DUPDATE) AS DUPDATE
          FROM deegar AS d
            LEFT JOIN salary AS s ON d.PNUMBER = s.PNUMBER AND d.NODEEGAR = s.NODEEGAR
            LEFT JOIN cheque ON TRIM(d.CHEQUE) = cheque.CHEQUE
          ${whereClause}
          GROUP BY d.PNUMBER, d.NODEEGAR
          ORDER BY d.PNUMBER DESC, d.NODEEGAR DESC
          LIMIT ? OFFSET ?
        ) AS agg
      `,
      ...params,
      pageSize,
      offset,
    )) as Row[];

    const countRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) AS total FROM (
          SELECT d.PNUMBER, d.NODEEGAR
          FROM deegar AS d
            LEFT JOIN salary AS s ON d.PNUMBER = s.PNUMBER AND d.NODEEGAR = s.NODEEGAR
            LEFT JOIN cheque ON TRIM(d.CHEQUE) = cheque.CHEQUE
          ${whereClause}
          GROUP BY d.PNUMBER, d.NODEEGAR
        ) grouped
      `,
      ...params,
    )) as { total: bigint }[];

    const items = rows.map((row) => ({
      PNUMBER: row.PNUMBER ?? '',
      NODEEGAR: row.NODEEGAR ?? '',
      MONEY: Number(row.MONEY ?? 0),
      ACCNAME: row.ACCNAME ?? '',
      CHEQUE: row.CHEQUE ?? '',
      PAYDATE: row.PAYDATE instanceof Date ? row.PAYDATE.toISOString() : row.PAYDATE,
      MPAYALL: Number(row.MPAYALL ?? 0),
      BALANCE: Number(row.BALANCE ?? 0),
      DUPDATE: row.DUPDATE instanceof Date ? row.DUPDATE.toISOString() : row.DUPDATE,
    }));

    const total = Number(countRows?.[0]?.total ?? 0);
    const totalIncome = items.reduce((sum, r) => sum + r.MONEY, 0);
    const totalOutcome = items.reduce((sum, r) => sum + r.MPAYALL, 0);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalIncome,
      totalOutcome,
      totalBalance: items.reduce((sum, r) => sum + r.BALANCE, 0),
    });
  } catch (err: any) {
    console.error('reports summarydeegar API error', err);
    return NextResponse.json(
      { error: 'Failed to load summarydeegar report', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

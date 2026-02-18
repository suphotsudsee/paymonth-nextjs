import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pnumber = searchParams.get('pnumber')?.trim() || undefined;
    const nodeegar = searchParams.get('nodeegar')?.trim() || undefined;
    const accnumber = searchParams.get('accnumber')?.trim() || undefined;
    const accname = searchParams.get('accname')?.trim() || undefined;
    const cheque = searchParams.get('cheque')?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || 10)));
    const offset = (page - 1) * pageSize;

    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const filters: string[] = [];
    const params: any[] = [];

    if (pnumber) {
      filters.push('deegar.PNUMBER LIKE ?');
      params.push(`%${pnumber}%`);
    }
    if (nodeegar) {
      filters.push('deegar.NODEEGAR LIKE ?');
      params.push(`%${nodeegar}%`);
    }
    if (accnumber) {
      filters.push('deegar.ACCNUMBER LIKE ?');
      params.push(`%${accnumber}%`);
    }
    if (accname) {
      filters.push('deegar.ACCNAME LIKE ?');
      params.push(`%${accname}%`);
    }
    if (cheque) {
      filters.push('deegar.CHEQUE LIKE ?');
      params.push(`%${cheque}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          COALESCE(salary.ID, deegar.ID) AS ID,
          bank.IDBANK,
          COALESCE(officer.NAME, regisdeegar.NAME) AS NAME,
          COALESCE(salary.CID, '') AS CID,
          COALESCE(salary.MONEY, deegar.MONEY) AS MONEY,
          deegar.PNUMBER,
          deegar.NODEEGAR,
          salary.NUM,
          deegar.CHEQUE,
          cheque.PAYDATE,
          deegar.ACCNUMBER,
          deegar.ACCNAME,
          deegar.TAX,
          deegar.FEE AS PAY
        FROM deegar
          LEFT JOIN salary ON salary.ID = (
            SELECT s2.ID
            FROM salary s2
            WHERE TRIM(s2.PNUMBER) = TRIM(deegar.PNUMBER)
              AND TRIM(s2.NODEEGAR) = TRIM(deegar.NODEEGAR)
            ORDER BY s2.DUPDATE DESC, s2.ID DESC
            LIMIT 1
          )
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.CID = salary.CID
          LEFT JOIN regisdeegar ON TRIM(regisdeegar.PNUMBER) = TRIM(deegar.PNUMBER)
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE
        ${whereClause}
        ORDER BY deegar.PNUMBER, deegar.NODEEGAR
        LIMIT ? OFFSET ?
      `, 
      ...params,
      pageSize,
      offset,
    )) as {
      ID: number;
      IDBANK: string | null;
      NAME: string | null;
      CID: string;
      MONEY: number;
      PNUMBER: string;
      NODEEGAR: string;
      NUM: string | null;
      PAYTYPE: string | null;
      IDPAY: string | null;
      CHEQUE: string | null;
      PAYDATE: Date | null;
      ACCNUMBER?: string | null;
      ACCNAME?: string | null;
      TAX?: number | null;
      PAY?: number | null;
    }[];

    const safeRows = rows.map((row) => ({
      ...row,
      ID: Number(row.ID),
      MONEY: Number(row.MONEY ?? 0),
      TAX: row.TAX === null || row.TAX === undefined ? null : Number(row.TAX),
      PAY: row.PAY === null || row.PAY === undefined ? null : Number(row.PAY),
      PAYDATE: row.PAYDATE instanceof Date ? row.PAYDATE.toISOString() : row.PAYDATE,
    }));

    const countRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) as total
        FROM deegar
          LEFT JOIN salary ON salary.ID = (
            SELECT s2.ID
            FROM salary s2
            WHERE TRIM(s2.PNUMBER) = TRIM(deegar.PNUMBER)
              AND TRIM(s2.NODEEGAR) = TRIM(deegar.NODEEGAR)
            ORDER BY s2.DUPDATE DESC, s2.ID DESC
            LIMIT 1
          )
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.CID = salary.CID
          LEFT JOIN regisdeegar ON TRIM(regisdeegar.PNUMBER) = TRIM(deegar.PNUMBER)
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE
        ${whereClause}
      `,
      ...params,
    )) as { total: bigint }[];

    const total = Number(countRows?.[0]?.total ?? 0);

    return NextResponse.json({
      items: safeRows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error('deegars API error', err);
    return NextResponse.json(
      { error: 'Failed to load deegars', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

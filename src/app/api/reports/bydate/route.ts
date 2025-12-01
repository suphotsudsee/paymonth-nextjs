import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

type Row = {
  ID: any;
  IDBANK: string | null;
  NAME: string | null;
  MONEY: any;
  PNUMBER: string | null;
  NODEEGAR: string | null;
  PAYTYPE: string | null;
  PAYNAME: string | null;
  IDPAY: string | null;
  CHEQUE: string | null;
  ACCNUMBER: string | null;
  PAYDATE: Date | null;
};

const FIELD_MAP: Record<string, string> = {
  pnumber: 'salary.PNUMBER',
  idbank: 'bank.IDBANK',
  accnumber: 'cheque.ACCNUMBER',
  cheque: 'deegar.CHEQUE',
  payname: 'cpay.PAYNAME',
  name: 'officer.NAME',
};

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 10)));
    const offset = (page - 1) * pageSize;

    const startRaw = searchParams.get('startdate') || '';
    const endRaw = searchParams.get('enddate') || '';
    const fieldKey = searchParams.get('field') || 'pnumber';
    const term = searchParams.get('query')?.trim();

    // If no date is provided, return empty without querying.
    if (!startRaw && !endRaw) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        totalMoney: 0,
      });
    }

    const parseDate = (value: string, fallback: string) => {
      const d = value ? new Date(value) : null;
      return d && !Number.isNaN(d.getTime()) ? value : fallback;
    };

    const startdate = parseDate(startRaw, '1900-01-01');
    const enddate = parseDate(endRaw, '2100-12-31');

    const filters: string[] = ['cheque.PAYDATE BETWEEN ? AND ?'];
    const params: any[] = [startdate, enddate];

    const column = FIELD_MAP[fieldKey] || FIELD_MAP.pnumber;
    if (term) {
      filters.push(`${column} LIKE ?`);
      params.push(`%${term}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `
        SELECT
          salary.ID,
          bank.IDBANK,
          officer.NAME,
          salary.MONEY,
          salary.PNUMBER,
          salary.NODEEGAR,
          cpay.PAYTYPE,
          cpay.PAYNAME,
          cpay.IDPAY,
          deegar.CHEQUE,
          cheque.ACCNUMBER,
          cheque.PAYDATE
        FROM salary
          INNER JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.id = salary.BANKID
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN deegar ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
          INNER JOIN cheque ON deegar.CHEQUE = cheque.CHEQUE
        ${whereClause}
        ORDER BY cheque.PAYDATE DESC, salary.PNUMBER DESC, salary.NODEEGAR DESC
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    );

    const countRows = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `
        SELECT COUNT(*) as total
        FROM salary
          INNER JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.id = salary.BANKID
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN deegar ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
          INNER JOIN cheque ON deegar.CHEQUE = cheque.CHEQUE
        ${whereClause}
      `,
      ...params,
    );

    const totalMoney = rows.reduce((sum, r) => sum + Number(r.MONEY ?? 0), 0);

    const items = rows.map((row) => ({
      ID: typeof row.ID === 'bigint' ? Number(row.ID) : Number(row.ID ?? 0),
      IDBANK: row.IDBANK ?? '',
      NAME: row.NAME ?? '',
      MONEY: Number(row.MONEY ?? 0),
      PNUMBER: row.PNUMBER ?? '',
      NODEEGAR: row.NODEEGAR ?? '',
      PAYTYPE: row.PAYTYPE ?? '',
      PAYNAME: row.PAYNAME ?? '',
      IDPAY: row.IDPAY ?? '',
      CHEQUE: row.CHEQUE ?? '',
      ACCNUMBER: row.ACCNUMBER ?? '',
      PAYDATE: row.PAYDATE instanceof Date ? row.PAYDATE.toISOString() : row.PAYDATE,
    }));

    return NextResponse.json({
      items,
      total: Number(countRows?.[0]?.total ?? 0),
      page,
      pageSize,
      totalPages: Math.ceil(Number(countRows?.[0]?.total ?? 0) / pageSize),
      totalMoney,
    });
  } catch (err: any) {
    console.error('reports bydate API error', err);
    return NextResponse.json(
      { error: 'Failed to load report by date', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

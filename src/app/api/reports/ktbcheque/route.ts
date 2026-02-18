import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

type Row = {
  IDBANK: string | null;
  NAMEBANK: string | null;
  ACCNAME: string | null;
  NAME: string | null;
  MONEY: any;
  CID: string | null;
  CHEQUE: string | null;
  PNUMBER: string | null;
  NODEEGAR: string | null;
  EMAIL: string | null;
  MOBILE: string | null;
  PAYDATE: Date | null;
  ID: any;
};

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cheque = searchParams.get('cheque')?.trim();
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(5000, Math.max(1, Number(searchParams.get('pageSize') || 50)));
    const offset = (page - 1) * pageSize;

    if (!cheque) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          bank.IDBANK,
          bank.NAMEBANK,
          deegar.ACCNAME,
          officer.NAME,
          officer.MOBILE,
          officer.EMAIL,
          salary.CID,
          salary.MONEY,
          salary.PNUMBER,
          salary.NODEEGAR,
          salary.NUM,
          cpay.PAYTYPE,
          cpay.IDPAY,
          deegar.CHEQUE,
          cheque.PAYDATE,
          salary.ID,
          COUNT(*) OVER() AS totalRows,
          SUM(salary.MONEY) OVER() AS totalMoney
        FROM salary
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.id = salary.BANKID
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN deegar ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE
        WHERE deegar.CHEQUE = ?
        ORDER BY salary.NODEEGAR, salary.NUM, officer.NAME
        LIMIT ? OFFSET ?
      `,
      cheque,
      pageSize,
      offset,
    )) as Row[];

    const toNumber = (v: any) => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0));

    const items = rows.map((row) => ({
      IDBANK: row.IDBANK ?? '',
      NAMEBANK: row.NAMEBANK ?? '',
      ACCNAME: row.ACCNAME ?? '',
      NAME: row.NAME ?? '',
      MONEY: toNumber(row.MONEY),
      CID: row.CID ?? '',
      CHEQUE: row.CHEQUE ?? '',
      PNUMBER: row.PNUMBER ?? '',
      NODEEGAR: row.NODEEGAR ?? '',
      EMAIL: row.EMAIL ?? '',
      MOBILE: row.MOBILE ?? '',
      PAYDATE: row.PAYDATE instanceof Date ? row.PAYDATE.toISOString() : row.PAYDATE,
      totalRows: toNumber((row as any).totalRows),
      totalMoney: toNumber((row as any).totalMoney),
      ID: toNumber(row.ID),
    }));

    const total = toNumber(items?.[0]?.totalRows ?? 0);
    const totalMoney = toNumber(items?.[0]?.totalMoney ?? 0);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalMoney,
    });
  } catch (err: any) {
    console.error('reports ktbcheque API error', err);
    return NextResponse.json(
      { error: 'Failed to load ktb deegar report', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

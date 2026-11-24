import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { isStaff } from '@/lib/permissions';
import { PAYVOUCHER_FROM, payvoucherWhere } from '@/lib/payvouchersQuery';

type Row = {
  PAYDATE: Date | null;
  ID: any;
  CHEQUE: string | null;
  CHEQUENAME: string | null;
  NAME: string | null;
  PAYNAME: string | null;
  PNUMBER: string | null;
  MONEY: any;
  totalRows?: any;
};


export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isStaff(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const start = searchParams.get('startdate')?.trim() || '';
    const end = searchParams.get('enddate')?.trim() || '';
    const fieldKey = searchParams.get('field') || 'pnumber';
    const term = searchParams.get('query')?.trim() || '';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(5000, Math.max(1, Number(searchParams.get('pageSize') || 50)));
    const offset = (page - 1) * pageSize;

    // Require date range; if missing return empty.
    if (!start || !end) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      });
    }

    const { whereClause, params } = payvoucherWhere(start, end, fieldKey, term);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          cheque.PAYDATE,
          cheque.ID,
          cheque.CHEQUE,
          cheque.CHEQUENAME,
          officer.NAME,
          cpay.PAYNAME,
          deegar.PNUMBER,
          salary.MONEY,
          COUNT(*) OVER() AS totalRows
        ${PAYVOUCHER_FROM}
        ${whereClause}
        ORDER BY cheque.PAYDATE, cheque.ID
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    )) as Row[];

    const toNumber = (v: any) => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0));

    const items = rows.map((row) => ({
      PAYDATE: row.PAYDATE instanceof Date ? row.PAYDATE.toISOString() : row.PAYDATE,
      ID: toNumber(row.ID),
      CHEQUE: row.CHEQUE ?? '',
      CHEQUENAME: row.CHEQUENAME ?? '',
      NAME: row.NAME ?? '',
      PAYNAME: row.PAYNAME ?? '',
      PNUMBER: row.PNUMBER ?? '',
      MONEY: toNumber(row.MONEY),
      totalRows: toNumber(row.totalRows),
    }));

    const total = toNumber(items?.[0]?.totalRows ?? 0);

    const totals = (await prisma.$queryRawUnsafe(
      `
        SELECT SUM(salary.MONEY) AS totalMoney
        ${PAYVOUCHER_FROM}
        ${whereClause}
      `,
      ...params,
    )) as { totalMoney: any }[];

    const totalMoney = toNumber(totals?.[0]?.totalMoney ?? 0);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalMoney,
    });
  } catch (err: any) {
    console.error('reports payvouchers API error', err);
    return NextResponse.json(
      { error: 'Failed to load pay voucher report', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

type Row = {
  ID: number | bigint;
  IDBANK: string | null;
  NAME: string | null;
  CID: string | null | bigint;
  MONEY: any;
  PNUMBER: string | null;
  NODEEGAR: string | null;
  NUM: string | null | number | bigint;
  PAYTYPE: string | null;
  IDPAY: string | null | number | bigint;
  CHEQUE: string | null;
  PAYDATE: Date | null;
  ACCNUMBER: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pnumber: string; nodeegar: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pnumber, nodeegar } = await params;

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `
        SELECT
          cheque.ID,
          bank.IDBANK,
          officer.NAME,
          salary.CID,
          salary.MONEY,
          salary.PNUMBER,
          salary.NODEEGAR,
          salary.NUM,
          cpay.PAYTYPE,
          cpay.IDPAY,
          deegar.CHEQUE,
          cheque.PAYDATE,
          cheque.ACCNUMBER
        FROM salary
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.id = salary.BANKID
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN deegar ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE
        WHERE salary.PNUMBER = ? AND salary.NODEEGAR = ?
        ORDER BY salary.NODEEGAR, salary.NUM, officer.NAME
      `,
      pnumber,
      nodeegar,
    );

    const toNumber = (value: any) =>
      typeof value === 'bigint' ? Number(value) : Number(value ?? 0);
    const toString = (value: any) =>
      typeof value === 'bigint' ? value.toString() : String(value ?? '');

    const items = rows.map((row) => ({
      ID: toNumber(row.ID),
      IDBANK: toString(row.IDBANK),
      NAME: row.NAME ?? '',
      CID: toString(row.CID),
      MONEY: toNumber(row.MONEY),
      PNUMBER: row.PNUMBER ?? '',
      NODEEGAR: row.NODEEGAR ?? '',
      NUM: toString(row.NUM),
      PAYTYPE: row.PAYTYPE ?? '',
      IDPAY: toString(row.IDPAY),
      CHEQUE: toString(row.CHEQUE),
      PAYDATE: row.PAYDATE instanceof Date ? row.PAYDATE.toISOString() : row.PAYDATE,
      ACCNUMBER: toString(row.ACCNUMBER),
    }));

    const totals = items.reduce(
      (acc, r) => {
        const money = Number(r.MONEY ?? 0);
        if (r.PAYTYPE === '1') acc.income += money;
        else acc.outcome += money;
        return acc;
      },
      { income: 0, outcome: 0 },
    );

    const balance = totals.income - totals.outcome;

    return NextResponse.json({
      items,
      total: items.length,
      totalIncome: totals.income,
      totalOutcome: totals.outcome,
      totalBalance: balance,
      chequeNumber: items[0]?.CHEQUE ?? '',
      accountNumber: items[0]?.ACCNUMBER ?? '',
    });
  } catch (err: any) {
    console.error('reports summarydeegar detail API error', err);
    return NextResponse.json(
      { error: 'Failed to load summarydeegar detail', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

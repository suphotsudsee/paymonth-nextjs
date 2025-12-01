import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cheque = searchParams.get('cheque')?.trim();

    if (!cheque) {
      return NextResponse.json({ error: 'Missing cheque' }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<
      {
        IDBANK: string | null;
        NAMEBANK: string | null;
        ACCNAME: string | null;
        NAME: string | null;
        MOBILE: string | null;
        EMAIL: string | null;
        CID: string | null;
        MONEY: any;
        PNUMBER: string | null;
        NODEEGAR: string | null;
        CHEQUE: string | null;
        PAYDATE: Date | null;
      }[]
    >(
      `
        SELECT salary.ID, bank.IDBANK, bank.NAMEBANK, officer.NAME, officer.MOBILE, officer.EMAIL, salary.CID, salary.MONEY,
          salary.PNUMBER, salary.NODEEGAR, salary.NUM, cpay.PAYTYPE, cpay.IDPAY, deegar.CHEQUE, deegar.ACCNAME, cheque.PAYDATE
        FROM salary
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.id = salary.BANKID
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN deegar ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE
        WHERE deegar.CHEQUE = ? AND cpay.IDPAY <> '20020' AND cpay.IDPAY <> '20019'
        ORDER BY salary.NODEEGAR, salary.NUM, officer.NAME
      `,
      cheque,
    );

    const toNumber = (v: any) => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0));
    const toDate = (d: Date | null) => {
      if (!d) return '';
      const pad = (n: number) => String(n).padStart(2, '0');
      const dd = new Date(d);
      if (Number.isNaN(dd.getTime())) return '';
      return `${dd.getFullYear()}-${pad(dd.getMonth() + 1)}-${pad(dd.getDate())}`;
    };

    const header = [
      'Receiving Bank Code',
      'Receiving A/C No.',
      'Receiver Name',
      'Transfer Amount',
      'Citizen ID/Tax ID',
      'DDA Ref',
      'Reference No./ DDA Ref 2',
      'EMAIL',
      'MOBILE',
      'PAYDATE',
    ];

    const csvRows = rows.map((row) => [
      row.IDBANK ?? '',
      row.ACCNAME ?? '',
      row.NAME ?? '',
      toNumber(row.MONEY).toFixed(2),
      row.CID ?? '',
      row.CHEQUE ?? '',
      `${row.PNUMBER ?? ''}/${row.NODEEGAR ?? ''}`,
      row.EMAIL ?? '',
      row.MOBILE ?? '',
      toDate(row.PAYDATE),
    ]);

    const csv =
      header.join(',') +
      '\n' +
      csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
      now.getHours(),
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `${cheque}_${stamp}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('ktbcheque export API error', err);
    return NextResponse.json(
      { error: 'Failed to export', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
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

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT salary.ID, bank.IDBANK, bank.NAMEBANK, officer.NAME, officer.MOBILE, officer.EMAIL, salary.CID, salary.MONEY,
          salary.PNUMBER, salary.NODEEGAR, salary.NUM, cpay.PAYTYPE, cpay.IDPAY, deegar.CHEQUE, deegar.ACCNAME, cheque.PAYDATE
        FROM salary
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON officer.CID = bank.CID
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN deegar ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE
        WHERE deegar.CHEQUE = ? AND cpay.IDPAY <> '20020' AND cpay.IDPAY <> '20019'
        ORDER BY salary.NODEEGAR, salary.NUM, officer.NAME
      `,
      cheque,
    )) as {
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
    }[];

    const toNumber = (v: any) => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0));
    const headerRow1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const headerRow2 = [
      'Receiving Bank Code',
      'Receiving A/C No.',
      'Receiver Name',
      'Transfer Amount',
      'Citizen ID/Tax ID',
      'DDA Ref',
      'Reference No./ DDA Ref 2',
      'EMAIL',
      'MOBILE',
      'NAMEBANK',
    ];

    const sheetRows = rows.map((row) => [
      '006',
      row.IDBANK ?? '',
      row.NAME ?? '',
      toNumber(row.MONEY),
      row.ACCNAME ?? '',
      '',
      row.PNUMBER ?? '',
      row.EMAIL ?? '',
      row.MOBILE ?? '',
      row.NAMEBANK ?? '',
    ]);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...sheetRows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}:${pad(
      now.getMinutes(),
    )}:${pad(now.getSeconds())}`;
    const filename = `${cheque}_${stamp}.xlsx`;
    return new NextResponse(workbookBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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

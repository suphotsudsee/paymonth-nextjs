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
    const normalizedCheque = cheque ? cheque.replace(/\s+/g, '') : '';

    if (!normalizedCheque) {
      return NextResponse.json({ error: 'Missing cheque' }, { status: 400 });
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT deegar.ID, bank.IDBANK, bank.NAMEBANK, COALESCE(officer.NAME, regisdeegar.NAME) AS NAME, officer.MOBILE, officer.EMAIL, salary.CID, COALESCE(salary.MONEY, deegar.MONEY) AS MONEY,
          deegar.PNUMBER, deegar.NODEEGAR, TRIM(deegar.CHEQUE) AS CHEQUE, deegar.ACCNAME, cheque.PAYDATE
        FROM deegar
          LEFT JOIN (
            SELECT MAX(s.ID) AS ID, s.PNUMBER, s.NODEEGAR
            FROM salary s
            GROUP BY s.PNUMBER, s.NODEEGAR
          ) latestSalary ON latestSalary.PNUMBER = deegar.PNUMBER AND latestSalary.NODEEGAR = deegar.NODEEGAR
          LEFT JOIN salary ON salary.ID = latestSalary.ID
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.id = salary.BANKID
          LEFT JOIN regisdeegar ON regisdeegar.PNUMBER = deegar.PNUMBER
          LEFT JOIN cheque ON cheque.CHEQUE = TRIM(deegar.CHEQUE)
        WHERE REPLACE(TRIM(deegar.CHEQUE), ' ', '') = ?
        ORDER BY deegar.PNUMBER, deegar.NODEEGAR
      `,
      normalizedCheque,
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

    const sheetRows = rows.map((row) => [
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

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...sheetRows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    const workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
      now.getHours(),
    )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
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

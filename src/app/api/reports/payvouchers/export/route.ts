import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { isStaff } from '@/lib/permissions';
import { attachmentHeader } from '@/lib/attachment';
import { PAYVOUCHER_FROM, payvoucherWhere } from '@/lib/payvouchersQuery';

// ส่งออก Excel ทะเบียนคุมหลักฐานการจ่าย — ทุกแถวตามเงื่อนไขเดียวกับ /api/reports/payvouchers (ไม่แบ่งหน้า)
// มาจากการแก้บน server (PRD 12); เพิ่ม isStaff ให้ตรงกับรายงานอื่น (บน server ตรวจแค่ login)

type Row = {
  PAYDATE: Date | null;
  ID: unknown;
  CHEQUE: string | null;
  CHEQUENAME: string | null;
  NAME: string | null;
  PAYNAME: string | null;
  PNUMBER: string | null;
  MONEY: unknown;
};

const toNumber = (value: unknown) => (typeof value === 'bigint' ? Number(value) : Number(value ?? 0));

const toDate = (value: Date | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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

    if (!start || !end) {
      return NextResponse.json({ error: 'Missing startdate or enddate' }, { status: 400 });
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
          salary.MONEY
        ${PAYVOUCHER_FROM}
        ${whereClause}
        ORDER BY cheque.PAYDATE, cheque.ID
      `,
      ...params,
    )) as Row[];

    const header = ['วดป/จ่าย', 'ลำดับที่', 'หมายเลขเช็ค', 'รายการเช็ค', 'จ่ายให้', 'รายการจ่าย', 'ที่ฎีกา', 'จำนวนเงิน'];
    const sheetRows = rows.map((row) => [
      toDate(row.PAYDATE),
      toNumber(row.ID),
      row.CHEQUE ?? '',
      row.CHEQUENAME ?? '',
      row.NAME ?? '',
      row.PAYNAME ?? '',
      row.PNUMBER ?? '',
      toNumber(row.MONEY),
    ]);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...sheetRows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'PayVouchers');
    const workbookBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const now = new Date();
    const pad = (part: number) => String(part).padStart(2, '0');
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `payvouchers_${start}_to_${end}_${stamp}`;

    return new NextResponse(workbookBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': attachmentHeader(filename, 'payvouchers-export'),
      },
    });
  } catch (err: unknown) {
    console.error('payvouchers export API error', err);
    return NextResponse.json({ error: 'Failed to export pay voucher report' }, { status: 500 });
  }
}

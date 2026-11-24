import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { isStaff } from '@/lib/permissions';
import { clampPageSize, parsePage } from '@/lib/pagination';

// GET /api/salaries/cheques?cheque=...
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isStaff(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const cheque = searchParams.get('cheque')?.trim() || '';
    // เพดาน/ค่าเริ่มต้น 1000 คงเดิม (ผู้เรียกเก่าที่ไม่ส่ง pageSize ได้ผลเหมือนเดิม); หน้าค้นหาเช็คส่ง pageSize ตามตัวเลือก 5–100
    const pageSize = clampPageSize(searchParams.get('pageSize'), 1000, 1000);
    const page = parsePage(searchParams.get('page'));
    const offset = (page - 1) * pageSize;

    if (!cheque) {
      return NextResponse.json(
        { items: [], total: 0, totals: { money: 0 }, page: 1, pageSize, totalPages: 0 },
        { status: 200 },
      );
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          COALESCE(deegar.ACCNUMBER, cheque.ACCNUMBER) AS ACCNUMBER,
          cheque.CHEQUE AS CHEQUE,
          cheque.PAYDATE,
          COALESCE(salary.PNUMBER, deegar.PNUMBER) AS PNUMBER,
          COALESCE(salary.NODEEGAR, deegar.NODEEGAR) AS NODEEGAR,
          COALESCE(salary.MONEY, deegar.MONEY, 0) AS MONEY
        FROM cheque
          LEFT JOIN deegar ON TRIM(deegar.CHEQUE) = cheque.CHEQUE
          LEFT JOIN salary ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
        WHERE cheque.CHEQUE LIKE ?
        -- deegar.ID, salary.ID ต่อท้ายให้ลำดับไม่ซ้ำ: แบ่งหน้าด้วย OFFSET แล้วแถวไม่หาย/ไม่ซ้ำข้ามหน้า
        ORDER BY cheque.CHEQUE, salary.PNUMBER, salary.NODEEGAR, deegar.ID, salary.ID
        LIMIT ? OFFSET ?
      `,
      `%${cheque}%`,
      pageSize,
      offset,
    )) as {
      ACCNUMBER: string | null;
      CHEQUE: string | null;
      PAYDATE: Date | null;
      PNUMBER: string | null;
      NODEEGAR: string | null;
      MONEY: number | null;
    }[];

    const countRows = (await prisma.$queryRawUnsafe(
      `
        -- ยอดรวมทั้งผลค้นหา (นิพจน์เดียวกับคอลัมน์ MONEY ด้านบน) — PRD 11.1
        SELECT COUNT(*) as total, COALESCE(SUM(COALESCE(salary.MONEY, deegar.MONEY, 0)), 0) AS sumMoney
        FROM cheque
          LEFT JOIN deegar ON TRIM(deegar.CHEQUE) = cheque.CHEQUE
          LEFT JOIN salary ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
        WHERE cheque.CHEQUE LIKE ?
      `,
      `%${cheque}%`,
    )) as { total: bigint; sumMoney: unknown }[];

    const safeRows = rows.map((row) => ({
      ACCNUMBER: row.ACCNUMBER ?? '-',
      CHEQUE: row.CHEQUE ?? '',
      PAYDATE: row.PAYDATE instanceof Date ? row.PAYDATE.toISOString() : row.PAYDATE,
      PNUMBER: row.PNUMBER ?? '',
      NODEEGAR: row.NODEEGAR ?? '',
      MONEY: Number(row.MONEY ?? 0),
    }));

    const total = Number(countRows?.[0]?.total ?? 0);

    return NextResponse.json({
      items: safeRows,
      total,
      totals: { money: Number(countRows?.[0]?.sumMoney ?? 0) },
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error('cheque salaries report error', err);
    return NextResponse.json(
      { error: 'Failed to load cheque salaries report', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

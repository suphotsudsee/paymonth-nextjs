import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

// GET /api/salaries/cheques?cheque=...
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cheque = searchParams.get('cheque')?.trim() || '';
    const pageSize = Math.min(1000, Math.max(1, Number(searchParams.get('pageSize') || 1000)));

    if (!cheque) {
      return NextResponse.json(
        { items: [], total: 0, page: 1, pageSize, totalPages: 0 },
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
          LEFT JOIN deegar ON cheque.CHEQUE = deegar.CHEQUE
          LEFT JOIN salary ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
        WHERE cheque.CHEQUE LIKE ?
        ORDER BY cheque.CHEQUE, salary.PNUMBER, salary.NODEEGAR
        LIMIT ?
      `,
      `%${cheque}%`,
      pageSize,
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
        SELECT COUNT(*) as total
        FROM cheque
          LEFT JOIN deegar ON cheque.CHEQUE = deegar.CHEQUE
          LEFT JOIN salary ON salary.PNUMBER = deegar.PNUMBER AND salary.NODEEGAR = deegar.NODEEGAR
        WHERE cheque.CHEQUE LIKE ?
      `,
      `%${cheque}%`,
    )) as { total: bigint }[];

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
      page: 1,
      pageSize,
      totalPages: 1,
    });
  } catch (err: any) {
    console.error('cheque salaries report error', err);
    return NextResponse.json(
      { error: 'Failed to load cheque salaries report', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

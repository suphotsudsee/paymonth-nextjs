import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

type Row = {
  PAYTYPE: string | null;
  MONTHTHAI: string | null;
  SMONEY: any;
  NAMEMONTH_TH: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const yearthai = searchParams.get('yearthai')?.trim() || '2557';

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `
        SELECT
          cpay.PAYTYPE,
          salary.MONTHTHAI,
          SUM(salary.MONEY) AS SMONEY,
          cmonth.NAMEMONTH_TH
        FROM salary
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
        WHERE salary.YEARTHAI = ?
        GROUP BY cpay.PAYTYPE, salary.MONTHTHAI
      `,
      yearthai,
    );

    const toNumber = (v: any) => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0));

    const monthMap: Record<string, { month: string; income: number; outcome: number }> = {};
    rows.forEach((r) => {
      const key = r.MONTHTHAI ?? '';
      if (!monthMap[key]) {
        monthMap[key] = { month: r.NAMEMONTH_TH ?? key, income: 0, outcome: 0 };
      }
      if (r.PAYTYPE === '1') {
        monthMap[key].income += toNumber(r.SMONEY);
      } else {
        monthMap[key].outcome += toNumber(r.SMONEY);
      }
    });

    const items = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    return NextResponse.json({
      yearthai,
      items,
    });
  } catch (err: any) {
    console.error('charts inout API error', err);
    return NextResponse.json(
      { error: 'Failed to load chart data', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

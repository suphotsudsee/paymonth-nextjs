import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.$queryRaw<{ DEPART: string | null }[]>`
      SELECT DISTINCT DEPART
      FROM station
      WHERE DEPART IS NOT NULL AND DEPART <> ''
      ORDER BY DEPART ASC
    `;

    return NextResponse.json({ departs: rows.map((r) => r.DEPART).filter(Boolean) });
  } catch (err: any) {
    console.error('stations departs API error', err);
    return NextResponse.json(
      { error: 'Failed to load departs', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

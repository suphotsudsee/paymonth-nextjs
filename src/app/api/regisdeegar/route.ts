import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = verifySession(req.cookies.get('session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await prisma.regisdeegar.findMany({
    orderBy: { REGISDATE: 'desc' },
    take: 200,
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = verifySession(req.cookies.get('session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const {
    PNUMBER,
    REGISDATE,
    NAME,
    MONEY = 0,
    TAX = 0,
    MONEYDRAW = 0,
    SENDDATE = null,
    GFMISNUMBER = '',
    BANKDATE = null,
    MONEYBANK = 0,
    GFMISREGIS = null,
    GFMISDATE = null,
    CODEBUDGET = '',
    CODEACTIVE = '',
  } = body;

  if (!PNUMBER || !REGISDATE || !NAME || !CODEBUDGET || !CODEACTIVE) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const created = await prisma.regisdeegar.create({
    data: {
      PNUMBER,
      REGISDATE: new Date(REGISDATE),
      NAME,
      MONEY,
      TAX,
      MONEYDRAW,
      SENDDATE: SENDDATE ? new Date(SENDDATE) : null,
      GFMISNUMBER,
      BANKDATE: BANKDATE ? new Date(BANKDATE) : null,
      MONEYBANK,
      GFMISREGIS,
      GFMISDATE: GFMISDATE ? new Date(GFMISDATE) : null,
      CODEBUDGET,
      CODEACTIVE,
      DUPDATE: new Date(),
    },
  });

  return NextResponse.json({ item: created });
}

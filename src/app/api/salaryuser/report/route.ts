import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cid = searchParams.get('cid')?.trim();

  const session = verifySession(req.cookies.get('session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!cid) {
    return NextResponse.json({ error: 'cid is required' }, { status: 400 });
  }

  const rows = await prisma.$queryRawUnsafe<
    {
      NAME: string;
      LPOS: string | null;
      NAMESTATION: string | null;
      CID: string;
      MONTHTHAI: string;
      YEARTHAI: string;
      NAMEMONTH_TH: string;
      INCOME: number;
      OUTCOME: number;
    }[]
  >(
    `
      SELECT
        officer.NAME,
        officer.LPOS,
        station.NAMESTATION,
        salary.CID,
        salary.MONTHTHAI,
        salary.YEARTHAI,
        cmonth.NAMEMONTH_TH,
        SUM(IF(cpay.PAYTYPE='1', salary.MONEY, 0)) AS INCOME,
        SUM(IF(cpay.PAYTYPE<>'1', salary.MONEY, 0)) AS OUTCOME
      FROM salary
        INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
        INNER JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
        INNER JOIN officer ON salary.CID = officer.CID
        INNER JOIN station ON officer.CODE = station.CODE
      WHERE salary.CID = ? AND salary.IDPAY <> '20004'
      GROUP BY salary.MONTHTHAI, salary.YEARTHAI
      ORDER BY CONCAT(salary.YEARTHAI, salary.MONTHTHAI) DESC
    `,
    cid,
  );

  return NextResponse.json({ items: rows });
}

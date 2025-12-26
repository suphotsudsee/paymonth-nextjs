import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAppSessionFromRequest } from '@/lib/session';
import { buildPaydirectAccessClause } from '@/lib/paydirect-access';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const xyear = searchParams.get('xyear')?.trim() ?? '';
  const xmonth = searchParams.get('xmonth')?.trim() ?? '';
  const xtype = searchParams.get('xtype_pis')?.trim() ?? '';
  const nameprn = searchParams.get('nameprn')?.trim() ?? '';

  const session = await getAppSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.role === "EDITOR" && !session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = buildPaydirectAccessClause(session, { paydirect: "paydirect", officer: "officer" });

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        paydirect.ID,
        paydirect.A,
        paydirect.B,
        paydirect.C,
        paydirect.D,
        paydirect.E,
        paydirect.F,
        station.DEPART,
        station.NAMESTATION,
        paydirect.SALARY,
        paydirect.O,
        paydirect.SALPOS,
        paydirect.NOCLINIC,
        paydirect.SUBJECT,
        paydirect.S,
        paydirect.AC,
        paydirect.AB,
        paydirect.AI,
        paydirect.RETIRE,
        paydirect.Q,
        paydirect.Y,
        paydirect.AA
      FROM paydirect
        LEFT JOIN officer ON officer.CID = paydirect.C
        LEFT JOIN station ON officer.CODE = station.CODE
      WHERE paydirect.A LIKE ? AND paydirect.B LIKE ?
        AND station.DEPART LIKE ? AND station.NAMESTATION LIKE ?
        AND ${access.clause}
    `,
    `%${xyear}%`,
    `%${xmonth}%`,
    `%${xtype}%`,
    `%${nameprn}%`,
    ...access.params,
  )) as {
    ID: number;
    A: string | null;
    B: string | null;
    C: string | null;
    D: string | null;
    E: string | null;
    F: string | null;
    DEPART: string | null;
    NAMESTATION: string | null;
    SALARY: number | null;
    O: string | null;
    SALPOS: string | null;
    NOCLINIC: string | null;
    SUBJECT: string | null;
    S: string | null;
    AC: string | null;
    AB: string | null;
    AI: string | null;
    RETIRE: string | null;
    Q: string | null;
    Y: string | null;
    AA: string | null;
  }[];

  return NextResponse.json({ items: rows });
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAppSessionFromRequest } from "@/lib/session";
import { buildOfficerAccessClause, buildPaydirectAccessClause } from "@/lib/paydirect-access";

type PaydirectRow = {
  NAMESTATION: string | null;
  CID: string;
  NAME: string | null;
  LPOS: string | null;
  NAMEMONTH_TH: string | null;
  id: string | null;
  A: string | null;
  B: string | null;
  TOTALINCOME: string | null;
  TOTALOUTCOME: string | null;
  BALANCE: string | null;
  PAYID: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> },
) {
  const session = await getAppSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cid } = await params;
  if (!cid) {
    return NextResponse.json({ error: "CID is required" }, { status: 400 });
  }

  const searchParams = new URL(req.url).searchParams;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));
  const offset = (page - 1) * pageSize;

  if (session.role === "EDITOR" && !session.orgId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const officerAccess = buildOfficerAccessClause(session, "officer");
  const officerRows = (await prisma.$queryRawUnsafe(
    `
      SELECT officer.CID
      FROM officer
      WHERE officer.CID = ?
        AND ${officerAccess.clause}
      LIMIT 1
    `,
    cid,
    ...officerAccess.params,
  )) as { CID: string }[];

  if (!officerRows.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const paydirectAccess = buildPaydirectAccessClause(session, { paydirect: "paydirect", officer: "officer" });
  const whereClause = `paydirect.C = ? AND ${paydirectAccess.clause}`;
  const whereParams = [cid, ...paydirectAccess.params];

  const items = (await prisma.$queryRawUnsafe(
    `
      SELECT
        station.NAMESTATION,
        officer.CID,
        officer.NAME,
        officer.LPOS,
        cmonth.NAMEMONTH_TH,
        CONCAT(paydirect.A, "-", paydirect.B) as id,
        paydirect.A,
        paydirect.B,
        paydirect.TOTALINCOME,
        paydirect.TOTALOUTCOME,
        paydirect.BALANCE,
        CAST(paydirect.ID AS CHAR) as PAYID
      FROM officer
      INNER JOIN paydirect ON officer.CID = paydirect.C
      INNER JOIN station ON officer.CODE = station.CODE
      INNER JOIN cmonth ON paydirect.B = cmonth.ID
      WHERE ${whereClause}
      GROUP BY paydirect.A, paydirect.B
      ORDER BY CONCAT(paydirect.A, paydirect.B) DESC
      LIMIT ? OFFSET ?
    `,
    ...whereParams,
    pageSize,
    offset,
  )) as PaydirectRow[];

  const countRows = (await prisma.$queryRawUnsafe(
    `
      SELECT COUNT(*) as total
      FROM paydirect
      INNER JOIN officer ON officer.CID = paydirect.C
      WHERE ${whereClause}
    `,
    ...whereParams,
  )) as { total: bigint }[];

  const total = Number(countRows?.[0]?.total ?? 0);
  const officerInfo = items[0]
    ? {
        cid: items[0].CID,
        name: items[0].NAME,
        position: items[0].LPOS,
        station: items[0].NAMESTATION,
      }
    : null;

  return NextResponse.json({
    officer: officerInfo,
    items: items.map((item) => ({
      ...item,
      id: item.id ?? `${item.A ?? ""}-${item.B ?? ""}`,
      PAYID: item.PAYID ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

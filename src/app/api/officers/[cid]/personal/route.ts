import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

type PersonalRow = {
  NAME: string | null;
  LPOS: string | null;
  NAMESTATION: string | null;
  CID: string;
  MONTHTHAI: string;
  YEARTHAI: string;
  NAMEMONTH_TH: string;
  INCOME: number | string | null;
  OUTCOME: number | string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
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

    const items = (await prisma.$queryRawUnsafe(
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
        LIMIT ? OFFSET ?
      `,
      cid,
      pageSize,
      offset,
    )) as PersonalRow[];

    const countRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) as total
        FROM (
          SELECT salary.MONTHTHAI, salary.YEARTHAI
          FROM salary
            INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
            INNER JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
            INNER JOIN officer ON salary.CID = officer.CID
            INNER JOIN station ON officer.CODE = station.CODE
          WHERE salary.CID = ? AND salary.IDPAY <> '20004'
          GROUP BY salary.MONTHTHAI, salary.YEARTHAI
        ) AS grouped
      `,
      cid,
    )) as { total: bigint }[];

    const total = Number(countRows?.[0]?.total ?? 0);
    const officer = items[0]
      ? {
          cid: items[0].CID,
          name: items[0].NAME,
          position: items[0].LPOS,
          station: items[0].NAMESTATION,
        }
      : null;

    return NextResponse.json({
      officer,
      items: items.map((row) => ({
        ...row,
        INCOME: Number(row.INCOME ?? 0),
        OUTCOME: Number(row.OUTCOME ?? 0),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("personal salary load error", err);
    return NextResponse.json(
      { error: "Failed to load personal salary summary", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

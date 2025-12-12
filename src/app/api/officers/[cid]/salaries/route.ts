import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

type SalaryRow = {
  ID: bigint;
  CID: string;
  IDPAY: string;
  PAYNAME: string | null;
  PAYTYPE: string | null;
  PNUMBER: string;
  NODEEGAR: string;
  NUM: string;
  MONTHTHAI: string;
  YEARTHAI: string;
  NAMEMONTH_TH: string | null;
  MONEY: any;
  DUPDATE: Date | string | null;
  IDBANK: string | null;
  NAMEBANK: string | null;
  NAME: string | null;
  LPOS: string | null;
  NAMESTATION: string | null;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ cid: string }> }) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { cid } = await params;
    if (!cid) {
      return NextResponse.json({ error: "CID is required" }, { status: 400 });
    }

    const role = String(session.status || "").toLowerCase();
    if (role === "user" && session.cid !== cid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = new URL(req.url).searchParams;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));
    const offset = (page - 1) * pageSize;

    const idpay = searchParams.get("idpay")?.trim() || undefined;
    const pnumber = searchParams.get("pnumber")?.trim() || undefined;
    const nodeegar = searchParams.get("nodeegar")?.trim() || undefined;
    const monththai = searchParams.get("monththai")?.trim() || undefined;
    const yearthai = searchParams.get("yearthai")?.trim() || undefined;

    const filters: string[] = ["salary.CID = ?"];
    const paramsList: any[] = [cid];

    if (idpay) {
      filters.push("salary.IDPAY LIKE ?");
      paramsList.push(`%${idpay}%`);
    }
    if (pnumber) {
      filters.push("salary.PNUMBER LIKE ?");
      paramsList.push(`%${pnumber}%`);
    }
    if (nodeegar) {
      filters.push("salary.NODEEGAR LIKE ?");
      paramsList.push(`%${nodeegar}%`);
    }
    if (monththai) {
      filters.push("salary.MONTHTHAI = ?");
      paramsList.push(monththai.padStart(2, "0"));
    }
    if (yearthai) {
      filters.push("salary.YEARTHAI = ?");
      paramsList.push(yearthai);
    }

    const whereClause = `WHERE ${filters.join(" AND ")}`;

    const rows = await prisma.$queryRawUnsafe<SalaryRow[]>(
      `
        SELECT
          salary.ID,
          salary.CID,
          salary.IDPAY,
          cpay.PAYNAME,
          cpay.PAYTYPE,
          salary.PNUMBER,
          salary.NODEEGAR,
          salary.NUM,
          salary.MONTHTHAI,
          salary.YEARTHAI,
          cmonth.NAMEMONTH_TH,
          salary.MONEY,
          CASE
            WHEN salary.DUPDATE = '0000-00-00 00:00:00' THEN NULL
            ELSE salary.DUPDATE
          END AS DUPDATE,
          bank.IDBANK,
          bank.NAMEBANK,
          officer.NAME,
          officer.LPOS,
          station.NAMESTATION
        FROM salary
          LEFT JOIN cpay ON salary.IDPAY = cpay.IDPAY
          LEFT JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
          LEFT JOIN bank ON salary.BANKID = bank.id
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN station ON officer.CODE = station.CODE
        ${whereClause}
        ORDER BY CONCAT(salary.YEARTHAI, salary.MONTHTHAI) DESC, salary.ID DESC
        LIMIT ? OFFSET ?
      `,
      ...paramsList,
      pageSize,
      offset,
    );

    const countRows = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `
        SELECT COUNT(*) as total
        FROM salary
          LEFT JOIN cpay ON salary.IDPAY = cpay.IDPAY
          LEFT JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
          LEFT JOIN bank ON salary.BANKID = bank.id
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN station ON officer.CODE = station.CODE
        ${whereClause}
      `,
      ...paramsList,
    );

    const total = Number(countRows?.[0]?.total ?? 0);
    const officer = rows[0]
      ? {
          cid,
          name: rows[0].NAME,
          position: rows[0].LPOS,
          station: rows[0].NAMESTATION,
        }
      : null;

    const items = rows.map((row) => ({
      ...row,
      ID: Number(row.ID),
      MONEY: Number(row.MONEY ?? 0),
      DUPDATE:
        row.DUPDATE === null
          ? null
          : row.DUPDATE instanceof Date
            ? row.DUPDATE.toISOString()
            : row.DUPDATE,
    }));

    return NextResponse.json({
      officer,
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("salary by officer load error", err);
    return NextResponse.json(
      { error: "Failed to load salary records", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

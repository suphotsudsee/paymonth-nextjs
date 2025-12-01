import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cid = searchParams.get("cid")?.trim() || undefined;
    const name = searchParams.get("name")?.trim() || undefined;
    const monththai = searchParams.get("monththai")?.trim() || undefined;
    const yearthai = searchParams.get("yearthai")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));
    const offset = (page - 1) * pageSize;

    const filters: string[] = ["salary.IDPAY <> '20004'"];
    const params: any[] = [];

    if (cid) {
      filters.push("salary.CID = ?");
      params.push(cid);
    }
    if (name) {
      filters.push("officer.NAME LIKE ?");
      params.push(`%${name}%`);
    }

    if (monththai) {
      filters.push("salary.MONTHTHAI = ?");
      params.push(monththai);
    }
    if (yearthai) {
      filters.push("salary.YEARTHAI = ?");
      params.push(yearthai);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Paginate at the grouped-key level inside the DB: first select the keyset with LIMIT/OFFSET, then aggregate only those keys.
    const rows = await prisma.$queryRawUnsafe<
      {
        NAME: string | null;
        LPOS: string | null;
        NAMESTATION: string | null;
        CID: string;
        MONTHTHAI: string;
        YEARTHAI: string;
        NAMEMONTH_TH: string | null;
        INCOME: any;
        OUTCOME: any;
      }[]
    >(
      `
        SELECT
          officer.NAME,
          officer.LPOS,
          station.NAMESTATION,
          salary.MONTHTHAI,
          cmonth.NAMEMONTH_TH,
          salary.YEARTHAI,
          salary.CID,
          SUM(IF(cpay.PAYTYPE = '1', salary.MONEY, 0)) AS INCOME,
          SUM(IF(cpay.PAYTYPE <> '1', salary.MONEY, 0)) AS OUTCOME
        FROM (
          SELECT
            salary.CID,
            salary.MONTHTHAI,
            salary.YEARTHAI
          FROM salary
            INNER JOIN officer ON salary.CID = officer.CID
            INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
            LEFT JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
            LEFT JOIN station ON officer.CODE = station.CODE
          ${whereClause}
          GROUP BY salary.CID, salary.MONTHTHAI, salary.YEARTHAI
          ORDER BY CONCAT(salary.YEARTHAI, salary.MONTHTHAI) DESC, officer.NAME ASC
          LIMIT ? OFFSET ?
        ) AS lk
          INNER JOIN salary ON salary.CID = lk.CID AND salary.MONTHTHAI = lk.MONTHTHAI AND salary.YEARTHAI = lk.YEARTHAI
          INNER JOIN officer ON salary.CID = officer.CID
          LEFT JOIN station ON officer.CODE = station.CODE
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          LEFT JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
        ${whereClause ? `WHERE ${filters.join(" AND ")}` : ""}
        GROUP BY salary.CID, salary.MONTHTHAI, salary.YEARTHAI, officer.NAME, officer.LPOS, station.NAMESTATION, cmonth.NAMEMONTH_TH
        ORDER BY CONCAT(salary.YEARTHAI, salary.MONTHTHAI) DESC, officer.NAME ASC
      `,
      ...params,
      pageSize,
      offset,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `
        SELECT COUNT(*) as total FROM (
          SELECT salary.CID, salary.MONTHTHAI, salary.YEARTHAI
          FROM salary
            INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
            INNER JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
            INNER JOIN officer ON salary.CID = officer.CID
            LEFT JOIN station ON officer.CODE = station.CODE
          ${whereClause}
          GROUP BY salary.CID, salary.MONTHTHAI, salary.YEARTHAI
        ) AS grouped_rows
      `,
      ...params,
    );

    const totalRows = Number(countRows?.[0]?.total ?? 0);

    const totals = await prisma.$queryRawUnsafe<{ income: any; outcome: any }[]>(
      `
        SELECT
          SUM(IF(cpay.PAYTYPE = '1', salary.MONEY, 0)) AS income,
          SUM(IF(cpay.PAYTYPE <> '1', salary.MONEY, 0)) AS outcome
        FROM salary
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN officer ON salary.CID = officer.CID
        ${whereClause}
      `,
      ...params,
    );

    const totalIncome = Number(totals?.[0]?.income ?? 0);
    const totalOutcome = Number(totals?.[0]?.outcome ?? 0);

    const items = rows.map((r) => ({
      CID: r.CID,
      NAME: r.NAME,
      LPOS: r.LPOS,
      STATION: r.NAMESTATION,
      MONTHTHAI: r.MONTHTHAI,
      NAMEMONTH_TH: r.NAMEMONTH_TH,
      YEARTHAI: r.YEARTHAI,
      INCOME: Number(r.INCOME ?? 0),
      OUTCOME: Number(r.OUTCOME ?? 0),
    }));

    return NextResponse.json({
      items,
      total: totalRows,
      page,
      pageSize,
      totalPages: Math.ceil(totalRows / pageSize),
      totalIncome,
      totalOutcome,
    });
  } catch (err: any) {
    console.error("reports/all API error", err);
    return NextResponse.json(
      { error: "Failed to load report data", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

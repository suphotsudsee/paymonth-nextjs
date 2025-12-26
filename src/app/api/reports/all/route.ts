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

    // Use table aliases (s/o) up front so the same where-clause can be reused in all queries.
    const filters: string[] = ["s.IDPAY <> '20004'"];
    const params: any[] = [];

    if (cid) {
      filters.push("s.CID = ?");
      params.push(cid);
    }
    if (name) {
      filters.push("o.NAME LIKE ?");
      params.push(`%${name}%`);
    }

    if (monththai) {
      filters.push("s.MONTHTHAI = ?");
      params.push(monththai);
    }
    if (yearthai) {
      filters.push("s.YEARTHAI = ?");
      params.push(yearthai);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Paginate at the grouped-key level inside the DB: first select the keyset with LIMIT/OFFSET (derived table), then aggregate only those keys.
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT o.NAME,
               o.LPOS,
               st.NAMESTATION,
               s.MONTHTHAI,
               cm.NAMEMONTH_TH,
               s.YEARTHAI,
               s.CID,
               GROUP_CONCAT(DISTINCT cp.PAYNAME ORDER BY cp.PAYNAME SEPARATOR ', ') AS PAYNAME,
               SUM(CASE WHEN cp.PAYTYPE = '1' THEN s.MONEY ELSE 0 END) AS INCOME,
               SUM(CASE WHEN cp.PAYTYPE <> '1' THEN s.MONEY ELSE 0 END) AS OUTCOME
        FROM (
          SELECT s.CID, s.MONTHTHAI, s.YEARTHAI
          FROM salary s
          JOIN officer o ON o.CID = s.CID
          ${whereClause}
          GROUP BY s.CID, s.MONTHTHAI, s.YEARTHAI
          ORDER BY s.YEARTHAI DESC, s.MONTHTHAI DESC, o.NAME ASC
          LIMIT ? OFFSET ?
        ) AS pk
        JOIN salary s ON s.CID = pk.CID AND s.MONTHTHAI = pk.MONTHTHAI AND s.YEARTHAI = pk.YEARTHAI
        JOIN officer o ON o.CID = s.CID
        LEFT JOIN station st ON st.CODE = o.CODE
        JOIN cpay cp ON cp.IDPAY = s.IDPAY
        LEFT JOIN cmonth cm ON cm.ID = s.MONTHTHAI
        GROUP BY s.CID, s.MONTHTHAI, s.YEARTHAI, o.NAME, o.LPOS, st.NAMESTATION, cm.NAMEMONTH_TH
        ORDER BY s.YEARTHAI DESC, s.MONTHTHAI DESC, o.NAME ASC;

      `,
      ...params,
      pageSize,
      offset,
    )) as {
      NAME: string | null;
      LPOS: string | null;
      NAMESTATION: string | null;
      CID: string;
      MONTHTHAI: string;
      YEARTHAI: string;
      NAMEMONTH_TH: string | null;
      PAYNAME: string | null;
      INCOME: any;
      OUTCOME: any;
    }[];

    const countRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) AS total
        FROM (
          SELECT s.CID, s.MONTHTHAI, s.YEARTHAI
          FROM salary s
          JOIN officer o ON o.CID = s.CID
          ${whereClause}
          GROUP BY s.CID, s.MONTHTHAI, s.YEARTHAI
        ) AS count_q
      `,
      ...params,
    )) as { total: bigint }[];

    const totalRows = Number(countRows?.[0]?.total ?? 0);

    const totals = (await prisma.$queryRawUnsafe(
      `
        SELECT
          SUM(IF(cpay.PAYTYPE = '1', salary.MONEY, 0)) AS income,
          SUM(IF(cpay.PAYTYPE <> '1', salary.MONEY, 0)) AS outcome
        FROM salary
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN officer ON salary.CID = officer.CID
        ${whereClause.replace(/s\./g, "salary.").replace(/o\./g, "officer.")}
      `,
      ...params,
    )) as { income: any; outcome: any }[];

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
      PAYNAME: r.PAYNAME,
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

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

const PNUMBER_MAX_LENGTH = 10;

// GET /api/deegars
// Supports optional filters: pnumber, nodeegar, accnumber, accname, cheque
// Pagination: page, pageSize
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const status = String(session.status || "").toLowerCase();
    const accessLevel = Number(session.accessLevel || 0);
    const isLimitedUser = status === "user" && accessLevel <= 0;
    if (isLimitedUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pnumber = searchParams.get("pnumber")?.trim() || undefined;
    const nodeegar = searchParams.get("nodeegar")?.trim() || undefined;
    const accnumber = searchParams.get("accnumber")?.trim() || undefined;
    const accname = searchParams.get("accname")?.trim() || undefined;
    const cheque = searchParams.get("cheque")?.trim() || undefined;
    const tax = searchParams.get("tax")?.trim();
    const pay = searchParams.get("pay")?.trim();
    const money = searchParams.get("money")?.trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: any[] = [];

    if (pnumber) {
      filters.push("deegar.PNUMBER LIKE ?");
      params.push(`%${pnumber}%`);
    }
    if (nodeegar) {
      filters.push("deegar.NODEEGAR LIKE ?");
      params.push(`%${nodeegar}%`);
    }
    if (accnumber) {
      filters.push("deegar.ACCNUMBER LIKE ?");
      params.push(`%${accnumber}%`);
    }
    if (accname) {
      filters.push("deegar.ACCNAME LIKE ?");
      params.push(`%${accname}%`);
    }
    if (cheque) {
      filters.push("deegar.CHEQUE LIKE ?");
      params.push(`%${cheque}%`);
    }
    if (tax && !Number.isNaN(Number(tax))) {
      filters.push("deegar.TAX = ?");
      params.push(Number(tax));
    }
    if (pay && !Number.isNaN(Number(pay))) {
      filters.push("deegar.FEE = ?");
      params.push(Number(pay));
    }
    if (money && !Number.isNaN(Number(money))) {
      filters.push("deegar.MONEY = ?");
      params.push(Number(money));
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // ❗ important: NEVER interpolate user input directly into the SQL template string.
    // Always pass dynamic values via "?" placeholders in the parameter list.
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          deegar.PNUMBER,
          deegar.NODEEGAR,
          deegar.ACCNUMBER,
          deegar.ACCNAME,
          deegar.TAX,
          deegar.FEE AS PAY,
          deegar.MONEY,
          deegar.CHEQUE
        FROM deegar
        ${whereClause}
        ORDER BY deegar.PNUMBER, deegar.NODEEGAR
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    )) as {
      PNUMBER: string;
      NODEEGAR: string;
      ACCNUMBER: string | null;
      ACCNAME: string | null;
      TAX: number | null;
      PAY: number | null;
      MONEY: number | null;
      CHEQUE: string | null;
    }[];

    const countRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) as total
        FROM deegar
        ${whereClause}
      `,
      ...params,
    )) as { total: bigint }[];

    const total = Number(countRows?.[0]?.total ?? 0);

    return NextResponse.json({
      items: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("deegars API error", err);
    return NextResponse.json(
      { error: "Failed to load deegars", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

// POST /api/deegars
// Body: { pnumber, nodeegar, accnumber, accname, tax, pay, money, cheque }
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const pnumber = String(body?.pnumber || "").trim();
    const nodeegar = String(body?.nodeegar || "").trim() || "1";
    const accnumber = String(body?.accnumber || "").trim();
    const accname = String(body?.accname || "").trim();
    const tax = Number(body?.tax || 0);
    const pay = Number(body?.pay || 0);
    const money = Number(body?.money || 0);
    const cheque = body?.cheque ? String(body.cheque).trim() : null;

    if (!pnumber || !accnumber || !accname) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (pnumber.length > PNUMBER_MAX_LENGTH) {
      return NextResponse.json(
        { error: `PNUMBER must be at most ${PNUMBER_MAX_LENGTH} characters` },
        { status: 400 },
      );
    }

    const created = await prisma.deegar.create({
      data: {
        PNUMBER: pnumber,
        NODEEGAR: nodeegar || "1",
        ACCNUMBER: accnumber,
        ACCNAME: accname,
        TAX: tax,
        FEE: pay,
        MONEY: money,
        CHEQUE: cheque,
        DUPDATE: new Date(),
      },
    });

    return NextResponse.json({ item: created });
  } catch (err: any) {
    console.error("create deegar error", err);
    return NextResponse.json(
      { error: "Failed to create deegar", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

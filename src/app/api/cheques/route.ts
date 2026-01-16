import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

// GET /api/cheques
// Filters: cheque, chequename, accnumber, paydate
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const cheque = searchParams.get("cheque")?.trim() || undefined;
    const chequename = searchParams.get("chequename")?.trim() || undefined;
    const accnumber = searchParams.get("accnumber")?.trim() || undefined;
    const paydate = searchParams.get("paydate")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));
    const offset = (page - 1) * pageSize;
    const recent = searchParams.get("recent") === "1";

    const filters: string[] = [];
    const params: any[] = [];

    if (cheque) {
      filters.push("cheque.CHEQUE LIKE ?");
      params.push(`%${cheque}%`);
    }
    if (chequename) {
      filters.push("cheque.CHEQUENAME LIKE ?");
      params.push(`%${chequename}%`);
    }
    if (accnumber) {
      filters.push("cheque.ACCNUMBER LIKE ?");
      params.push(`%${accnumber}%`);
    }
    if (paydate) {
      filters.push("cheque.PAYDATE = ?");
      params.push(paydate);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const orderBy = recent ? "DUPDATE DESC" : "CHEQUE";
    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT CHEQUE, CHEQUENAME, ACCNUMBER, PAYDATE, DUPDATE
        FROM cheque
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    )) as { CHEQUE: string; CHEQUENAME: string; ACCNUMBER: string; PAYDATE: Date | null; DUPDATE: Date }[];

    const countRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) as total
        FROM cheque
        ${whereClause}
      `,
      ...params,
    )) as { total: bigint }[];

    const toIso = (d: Date | null) => (d ? d.toISOString() : null);

    const items = rows.map((r) => ({
      CHEQUE: r.CHEQUE,
      CHEQUENAME: r.CHEQUENAME,
      ACCNUMBER: r.ACCNUMBER,
      PAYDATE: toIso(r.PAYDATE),
      DUPDATE: toIso(r.DUPDATE)!,
    }));

    const total = Number(countRows?.[0]?.total ?? 0);
    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("cheques API error", err);
    return NextResponse.json(
      { error: "Failed to load cheques", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const cheque = String(body?.cheque || "").trim();
    const chequename = String(body?.chequename || "").trim();
    const accnumber = String(body?.accnumber || "").trim();
    const paydate = body?.paydate ? new Date(body.paydate) : null;

    if (!cheque || !chequename || !accnumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await prisma.cheque.create({
      data: {
        CHEQUE: cheque,
        CHEQUENAME: chequename,
        ACCNUMBER: accnumber,
        PAYDATE: paydate,
        DUPDATE: new Date(),
      },
    });

    return NextResponse.json({
      item: {
        CHEQUE: created.CHEQUE,
        CHEQUENAME: created.CHEQUENAME,
        ACCNUMBER: created.ACCNUMBER,
        PAYDATE: created.PAYDATE?.toISOString() ?? null,
        DUPDATE: created.DUPDATE.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("create cheque error", err);
    return NextResponse.json(
      { error: "Failed to create cheque", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

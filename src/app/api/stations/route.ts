import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

// GET /api/stations
// - Without pagination params: returns { stations } for dropdowns.
// - With pagination params: returns paginated list with filters.
export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("pageSize");
    const hasPagination = pageParam !== null || pageSizeParam !== null;

    // Simple list (backward compatible for officer dropdowns)
    if (!hasPagination) {
      const stations = await prisma.$queryRaw<
        { CODE: string; NAMESTATION: string | null }[]
      >`
        SELECT MIN(CODE) AS CODE, NAMESTATION
        FROM station
        GROUP BY NAMESTATION
        ORDER BY NAMESTATION ASC
      `;
      return NextResponse.json({ stations });
    }

    const code = searchParams.get("code")?.trim() || undefined;
    const depart = searchParams.get("depart")?.trim() || undefined;
    const codeplace = searchParams.get("codeplace")?.trim() || undefined;
    const namestation = searchParams.get("namestation")?.trim() || undefined;
    const page = Math.max(1, Number(pageParam || 1));
    const pageSize = Math.min(50, Math.max(1, Number(pageSizeParam || 10)));
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: any[] = [];

    if (code) {
      filters.push("station.CODE LIKE ?");
      params.push(`%${code}%`);
    }
    if (depart) {
      filters.push("station.DEPART LIKE ?");
      params.push(`%${depart}%`);
    }
    if (codeplace) {
      filters.push("station.CODEPLACE LIKE ?");
      params.push(`%${codeplace}%`);
    }
    if (namestation) {
      filters.push("station.NAMESTATION LIKE ?");
      params.push(`%${namestation}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const rows = await prisma.$queryRawUnsafe<
      { CODE: string; DEPART: string | null; CODEPLACE: string | null; NAMESTATION: string | null }[]
    >(
      `
        SELECT CODE, DEPART, CODEPLACE, NAMESTATION
        FROM station
        ${whereClause}
        ORDER BY CODE
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    );

    const countRows = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `
        SELECT COUNT(*) as total
        FROM station
        ${whereClause}
      `,
      ...params,
    );

    const total = Number(countRows?.[0]?.total ?? 0);
    return NextResponse.json({
      items: rows.map((r) => ({
        CODE: r.CODE,
        DEPART: r.DEPART,
        CODEPLACE: r.CODEPLACE,
        NAMESTATION: r.NAMESTATION,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("stations API error", err);
    return NextResponse.json(
      { error: "Failed to load stations", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

// POST /api/stations
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const code = String(body?.code || "").trim();
    const depart = body?.depart ? String(body.depart).trim() : null;
    const codeplace = body?.codeplace ? String(body.codeplace).trim() : null;
    const namestation = body?.namestation ? String(body.namestation).trim() : null;

    if (!code || !namestation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await prisma.station.create({
      data: {
        CODE: code,
        DEPART: depart,
        CODEPLACE: codeplace,
        NAMESTATION: namestation,
      },
    });

    return NextResponse.json({
      item: {
        CODE: created.CODE,
        DEPART: created.DEPART,
        CODEPLACE: created.CODEPLACE,
        NAMESTATION: created.NAMESTATION,
      },
    });
  } catch (err: any) {
    console.error("create station error", err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Station code already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create station", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

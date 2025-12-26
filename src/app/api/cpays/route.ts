import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

// GET /api/cpays
// - Without pagination params: returns { items } for dropdowns.
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

    if (!hasPagination) {
      const items = await prisma.$queryRaw<{ IDPAY: string; PAYNAME: string | null; PAYTYPE: string | null }[]>`
        SELECT IDPAY, PAYNAME, PAYTYPE
        FROM cpay
        ORDER BY IDPAY ASC
      `;
      return NextResponse.json({ items });
    }

    const idpay = searchParams.get("idpay")?.trim() || undefined;
    const payname = searchParams.get("payname")?.trim() || undefined;
    const paytype = searchParams.get("paytype")?.trim() || undefined;
    const page = Math.max(1, Number(pageParam || 1));
    const pageSize = Math.min(50, Math.max(1, Number(pageSizeParam || 10)));
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: any[] = [];

    if (idpay) {
      filters.push("cpay.IDPAY LIKE ?");
      params.push(`%${idpay}%`);
    }
    if (payname) {
      filters.push("cpay.PAYNAME LIKE ?");
      params.push(`%${payname}%`);
    }
    if (paytype) {
      filters.push("cpay.PAYTYPE LIKE ?");
      params.push(`%${paytype}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT IDPAY, PAYNAME, PAYTYPE
        FROM cpay
        ${whereClause}
        ORDER BY IDPAY
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    )) as { IDPAY: string; PAYNAME: string | null; PAYTYPE: string | null }[];

    const countRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) as total
        FROM cpay
        ${whereClause}
      `,
      ...params,
    )) as { total: bigint }[];

    const total = Number(countRows?.[0]?.total ?? 0);
    return NextResponse.json({
      items: rows.map((r) => ({
        IDPAY: r.IDPAY,
        PAYNAME: r.PAYNAME,
        PAYTYPE: r.PAYTYPE,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error("cpays API error", err);
    return NextResponse.json(
      { error: "Failed to load cpay", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

// POST /api/cpays
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const idpay = String(body?.idpay || "").trim();
    const payname = body?.payname ? String(body.payname).trim() : null;
    const paytype = body?.paytype ? String(body.paytype).trim() : null;

    if (!idpay || !payname) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await prisma.cpay.create({
      data: {
        IDPAY: idpay,
        PAYNAME: payname,
        PAYTYPE: paytype,
      },
    });

    return NextResponse.json({
      item: {
        IDPAY: created.IDPAY,
        PAYNAME: created.PAYNAME,
        PAYTYPE: created.PAYTYPE,
      },
    });
  } catch (err: any) {
    console.error("create cpay error", err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "รหัสซ้ำในระบบ" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to create cpay", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

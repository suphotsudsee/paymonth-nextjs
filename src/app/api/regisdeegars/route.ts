import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

const serializeDates = (d: Date | null) => (d ? d.toISOString() : null);

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const pnumber = searchParams.get("pnumber")?.trim() || undefined;
    const name = searchParams.get("name")?.trim() || undefined;
    const codebudget = searchParams.get("codebudget")?.trim() || undefined;
    const regisdate = searchParams.get("regisdate")?.trim() || undefined;
    const senddate = searchParams.get("senddate")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: any[] = [];

    if (pnumber) {
      filters.push("regisdeegar.PNUMBER LIKE ?");
      params.push(`%${pnumber}%`);
    }
    if (name) {
      filters.push("regisdeegar.NAME LIKE ?");
      params.push(`%${name}%`);
    }
    if (codebudget) {
      filters.push("regisdeegar.CODEBUDGET LIKE ?");
      params.push(`%${codebudget}%`);
    }
    if (regisdate) {
      filters.push("regisdeegar.REGISDATE = ?");
      params.push(regisdate);
    }
    if (senddate) {
      filters.push("regisdeegar.SENDDATE = ?");
      params.push(senddate);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const rows = await prisma.$queryRawUnsafe<
      {
        PNUMBER: string;
        NAME: string;
        MONEY: any;
        TAX: any;
        MONEYDRAW: any;
        REGISDATE: Date;
        SENDDATE: Date | null;
        DUPDATE: Date;
      }[]
    >(
      `
        SELECT PNUMBER, NAME, MONEY, TAX, MONEYDRAW, REGISDATE, SENDDATE, DUPDATE
        FROM regisdeegar
        ${whereClause}
        ORDER BY PNUMBER
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    );

    const countRows = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `
        SELECT COUNT(*) as total
        FROM regisdeegar
        ${whereClause}
      `,
      ...params,
    );

    const items = rows.map((r) => ({
      PNUMBER: r.PNUMBER,
      NAME: r.NAME,
      MONEY: Number(r.MONEY ?? 0),
      TAX: Number(r.TAX ?? 0),
      MONEYDRAW: Number(r.MONEYDRAW ?? 0),
      REGISDATE: serializeDates(r.REGISDATE)!,
      SENDDATE: serializeDates(r.SENDDATE),
      DUPDATE: serializeDates(r.DUPDATE)!,
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
    console.error("regisdeegars API error", err);
    return NextResponse.json(
      { error: "Failed to load regisdeegars", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const pnumber = String(body?.pnumber || "").trim();
    const name = String(body?.name || "").trim();
    const codebudget = String(body?.codebudget || "").trim();
    const codeactive = String(body?.codeactive || "").trim();
    const gfmisnumber = String(body?.gfmisnumber || "").trim();
    const regisdate = body?.regisdate ? new Date(body.regisdate) : null;
    const senddate = body?.senddate ? new Date(body.senddate) : null;
    const money = Number(body?.money || 0);
    const tax = Number(body?.tax || 0);
    const moneydraw = Number(body?.moneydraw || 0);

    if (!pnumber || !name || !codebudget || !codeactive || !gfmisnumber || !regisdate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const created = await prisma.regisdeegar.create({
      data: {
        PNUMBER: pnumber,
        NAME: name,
        MONEY: money,
        TAX: tax,
        MONEYDRAW: moneydraw,
        REGISDATE: regisdate,
        SENDDATE: senddate,
        CODEBUDGET: codebudget,
        CODEACTIVE: codeactive,
        GFMISNUMBER: gfmisnumber,
        DUPDATE: new Date(),
      },
    });

    return NextResponse.json({
      item: {
        ID: Number(created.ID),
        PNUMBER: created.PNUMBER,
        NAME: created.NAME,
        MONEY: Number(created.MONEY ?? 0),
        TAX: Number(created.TAX ?? 0),
        MONEYDRAW: Number(created.MONEYDRAW ?? 0),
        REGISDATE: created.REGISDATE.toISOString(),
        SENDDATE: created.SENDDATE ? created.SENDDATE.toISOString() : null,
        CODEBUDGET: created.CODEBUDGET,
        CODEACTIVE: created.CODEACTIVE,
        GFMISNUMBER: created.GFMISNUMBER,
      },
    });
  } catch (err: any) {
    console.error("create regisdeegar error", err);
    return NextResponse.json(
      { error: "Failed to create regisdeegar", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

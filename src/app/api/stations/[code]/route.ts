import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await ctx.params;
    const stationCode = code?.trim();
    if (!stationCode) {
      return NextResponse.json({ error: "Missing station code" }, { status: 400 });
    }

    const station = await prisma.station.findUnique({
      where: { CODE: stationCode },
    });

    if (!station) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        CODE: station.CODE,
        DEPART: station.DEPART,
        CODEPLACE: station.CODEPLACE,
        NAMESTATION: station.NAMESTATION,
      },
    });
  } catch (err: any) {
    console.error("station detail error", err);
    return NextResponse.json(
      { error: "Failed to load station detail", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await ctx.params;
    const stationCode = code?.trim();
    if (!stationCode) {
      return NextResponse.json({ error: "Missing station code" }, { status: 400 });
    }

    const body = await req.json();
    const newCode = String(body?.code || "").trim();
    const depart = body?.depart ? String(body.depart).trim() : null;
    const codeplace = body?.codeplace ? String(body.codeplace).trim() : null;
    const namestation = body?.namestation ? String(body.namestation).trim() : null;

    if (!newCode || !namestation) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updated = await prisma.station.update({
      where: { CODE: stationCode },
      data: {
        CODE: newCode,
        DEPART: depart,
        CODEPLACE: codeplace,
        NAMESTATION: namestation,
      },
    });

    return NextResponse.json({
      item: {
        CODE: updated.CODE,
        DEPART: updated.DEPART,
        CODEPLACE: updated.CODEPLACE,
        NAMESTATION: updated.NAMESTATION,
      },
    });
  } catch (err: any) {
    console.error("update station error", err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Station code already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to update station", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const months = await prisma.$queryRaw<{ ID: string; NAMEMONTH_TH: string }[]>`
      SELECT ID, NAMEMONTH_TH
      FROM cmonth
      ORDER BY ID ASC
    `;

    return NextResponse.json({ months });
  } catch (err: any) {
    console.error("cmonths API error", err);
    return NextResponse.json(
      { error: "Failed to load months", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ cheque: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { cheque } = await ctx.params;
    const chequeId = cheque?.trim();
    if (!chequeId) {
      return NextResponse.json({ error: "Missing cheque id" }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<
      { ID: bigint; CHEQUE: string; CHEQUENAME: string; ACCNUMBER: string; PAYDATE: Date | null }[]
    >(
      `
        SELECT ID, CHEQUE, CHEQUENAME, ACCNUMBER, PAYDATE
        FROM cheque
        WHERE CHEQUE = ?
        LIMIT 1
      `,
      chequeId,
    );

    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const item = rows[0];
    return NextResponse.json({
      item: {
        ID: Number(item.ID),
        CHEQUE: item.CHEQUE,
        CHEQUENAME: item.CHEQUENAME,
        ACCNUMBER: item.ACCNUMBER,
        PAYDATE: item.PAYDATE ? item.PAYDATE.toISOString().slice(0, 10) : null,
      },
    });
  } catch (err: any) {
    console.error("cheque detail error", err);
    return NextResponse.json(
      { error: "Failed to load cheque detail", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ cheque: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { cheque } = await ctx.params;
    const chequeId = cheque?.trim();
    if (!chequeId) {
      return NextResponse.json({ error: "Missing cheque id" }, { status: 400 });
    }

    const body = await req.json();
    const newCheque = String(body?.cheque || "").trim();
    const chequename = String(body?.chequename || "").trim();
    const accnumber = String(body?.accnumber || "").trim();
    const paydate = body?.paydate ? new Date(body.paydate) : null;

    if (!newCheque || !chequename || !accnumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updated = await prisma.cheque.update({
      where: { CHEQUE: chequeId },
      data: {
        CHEQUE: newCheque,
        CHEQUENAME: chequename,
        ACCNUMBER: accnumber,
        PAYDATE: paydate,
        DUPDATE: new Date(),
      },
    });

    return NextResponse.json({
      item: {
        ID: Number(updated.ID),
        CHEQUE: updated.CHEQUE,
        CHEQUENAME: updated.CHEQUENAME,
        ACCNUMBER: updated.ACCNUMBER,
        PAYDATE: updated.PAYDATE ? updated.PAYDATE.toISOString().slice(0, 10) : null,
      },
    });
  } catch (err: any) {
    console.error("update cheque error", err);
    return NextResponse.json(
      { error: "Failed to update cheque", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

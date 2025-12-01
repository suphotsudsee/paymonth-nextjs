import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

const serializeDates = (d: Date | null) => (d ? d.toISOString() : null);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ pnumber: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { pnumber } = await ctx.params;
    const key = pnumber?.trim();
    if (!key) return NextResponse.json({ error: "Missing pnumber" }, { status: 400 });

    const rows = await prisma.$queryRawUnsafe<
      {
        ID: bigint;
        PNUMBER: string;
        NAME: string;
        MONEY: any;
        TAX: any;
        MONEYDRAW: any;
        REGISDATE: Date;
        SENDDATE: Date | null;
        CODEBUDGET: string;
        CODEACTIVE: string;
        GFMISNUMBER: string;
      }[]
    >(
      `
        SELECT ID, PNUMBER, NAME, MONEY, TAX, MONEYDRAW, REGISDATE, SENDDATE, CODEBUDGET, CODEACTIVE, GFMISNUMBER
        FROM regisdeegar
        WHERE PNUMBER = ?
        LIMIT 1
      `,
      key,
    );

    if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const r = rows[0];
    return NextResponse.json({
      item: {
        ID: Number(r.ID),
        PNUMBER: r.PNUMBER,
        NAME: r.NAME,
        MONEY: Number(r.MONEY ?? 0),
        TAX: Number(r.TAX ?? 0),
        MONEYDRAW: Number(r.MONEYDRAW ?? 0),
        REGISDATE: serializeDates(r.REGISDATE),
        SENDDATE: serializeDates(r.SENDDATE),
        CODEBUDGET: r.CODEBUDGET,
        CODEACTIVE: r.CODEACTIVE,
        GFMISNUMBER: r.GFMISNUMBER,
      },
    });
  } catch (err: any) {
    console.error("regisdeegar detail error", err);
    return NextResponse.json(
      { error: "Failed to load regisdeegar", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ pnumber: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { pnumber } = await ctx.params;
    const key = pnumber?.trim();
    if (!key) return NextResponse.json({ error: "Missing pnumber" }, { status: 400 });

    const body = await req.json();
    const newP = String(body?.pnumber || "").trim();
    const name = String(body?.name || "").trim();
    const codebudget = String(body?.codebudget || "").trim();
    const codeactive = String(body?.codeactive || "").trim();
    const gfmisnumber = String(body?.gfmisnumber || "").trim();
    const regisdate = body?.regisdate ? new Date(body.regisdate) : null;
    const senddate = body?.senddate ? new Date(body.senddate) : null;
    const money = Number(body?.money || 0);
    const tax = Number(body?.tax || 0);
    const moneydraw = Number(body?.moneydraw || 0);

    if (!newP || !name || !codebudget || !codeactive || !gfmisnumber || !regisdate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updated = await prisma.regisdeegar.update({
      where: { PNUMBER: key },
      data: {
        PNUMBER: newP,
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
        ID: Number(updated.ID),
        PNUMBER: updated.PNUMBER,
        NAME: updated.NAME,
        MONEY: Number(updated.MONEY ?? 0),
        TAX: Number(updated.TAX ?? 0),
        MONEYDRAW: Number(updated.MONEYDRAW ?? 0),
        REGISDATE: serializeDates(updated.REGISDATE),
        SENDDATE: serializeDates(updated.SENDDATE),
        CODEBUDGET: updated.CODEBUDGET,
        CODEACTIVE: updated.CODEACTIVE,
        GFMISNUMBER: updated.GFMISNUMBER,
      },
    });
  } catch (err: any) {
    console.error("update regisdeegar error", err);
    return NextResponse.json(
      { error: "Failed to update regisdeegar", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

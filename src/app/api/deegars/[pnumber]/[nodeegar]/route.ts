import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ pnumber: string; nodeegar: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pnumber: rawP, nodeegar: rawN } = await ctx.params;
    const pnumber = rawP?.trim();
    const nodeegar = rawN?.trim();
    if (!pnumber || !nodeegar) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<
      {
        ID: bigint;
        PNUMBER: string;
        NODEEGAR: string;
        ACCNUMBER: string;
        ACCNAME: string;
        TAX: any;
        PAY: any;
        MONEY: any;
        CHEQUE: string | null;
      }[]
    >(
      `
        SELECT ID, PNUMBER, NODEEGAR, ACCNUMBER, ACCNAME, TAX, FEE AS PAY, MONEY, CHEQUE
        FROM deegar
        WHERE PNUMBER = ? AND NODEEGAR = ?
        LIMIT 1
      `,
      pnumber,
      nodeegar,
    );

    if (!rows.length) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = rows[0];
    const toNumber = (v: any) => (v === null || v === undefined ? null : Number(v));

    const serialized = {
      ID: Number(item.ID),
      PNUMBER: item.PNUMBER,
      NODEEGAR: item.NODEEGAR,
      ACCNUMBER: item.ACCNUMBER,
      ACCNAME: item.ACCNAME,
      TAX: toNumber(item.TAX),
      PAY: toNumber(item.PAY),
      MONEY: toNumber(item.MONEY),
      CHEQUE: item.CHEQUE,
    };

    return NextResponse.json({ item: serialized });
  } catch (err: any) {
    console.error("fetch deegar detail error", err);
    return NextResponse.json(
      { error: "Failed to load deegar detail", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ pnumber: string; nodeegar: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pnumber: rawP, nodeegar: rawN } = await ctx.params;
    const keyP = rawP?.trim();
    const keyN = rawN?.trim();
    if (!keyP || !keyN) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
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

    const updated = await prisma.deegar.update({
      where: {
        PNUMBER_NODEEGAR: {
          PNUMBER: keyP,
          NODEEGAR: keyN,
        },
      },
      data: {
        PNUMBER: pnumber,
        NODEEGAR: nodeegar,
        ACCNUMBER: accnumber,
        ACCNAME: accname,
        TAX: tax,
        FEE: pay,
        MONEY: money,
        CHEQUE: cheque,
        DUPDATE: new Date(),
      },
    });

    const toNumber = (v: any) => (v === null || v === undefined ? null : Number(v));
    const serialized = {
      ID: Number(updated.ID),
      PNUMBER: updated.PNUMBER,
      NODEEGAR: updated.NODEEGAR,
      ACCNUMBER: updated.ACCNUMBER,
      ACCNAME: updated.ACCNAME,
      TAX: toNumber(updated.TAX),
      PAY: toNumber(updated.FEE),
      MONEY: toNumber(updated.MONEY),
      CHEQUE: updated.CHEQUE,
    };

    return NextResponse.json({ item: serialized });
  } catch (err: any) {
    console.error("update deegar error", err);
    return NextResponse.json(
      { error: "Failed to update deegar", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

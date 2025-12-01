import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ idpay: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { idpay } = await ctx.params;
    const code = idpay?.trim();
    if (!code) {
      return NextResponse.json({ error: "Missing idpay" }, { status: 400 });
    }

    const item = await prisma.cpay.findUnique({ where: { IDPAY: code } });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      item: {
        IDPAY: item.IDPAY,
        PAYNAME: item.PAYNAME,
        PAYTYPE: item.PAYTYPE,
      },
    });
  } catch (err: any) {
    console.error("cpay detail error", err);
    return NextResponse.json(
      { error: "Failed to load cpay detail", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ idpay: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { idpay } = await ctx.params;
    const code = idpay?.trim();
    if (!code) {
      return NextResponse.json({ error: "Missing idpay" }, { status: 400 });
    }

    const body = await req.json();
    const newIdpay = String(body?.idpay || "").trim();
    const payname = body?.payname ? String(body.payname).trim() : null;
    const paytype = body?.paytype ? String(body.paytype).trim() : null;

    if (!newIdpay || !payname) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updated = await prisma.cpay.update({
      where: { IDPAY: code },
      data: {
        IDPAY: newIdpay,
        PAYNAME: payname,
        PAYTYPE: paytype,
      },
    });

    return NextResponse.json({
      item: {
        IDPAY: updated.IDPAY,
        PAYNAME: updated.PAYNAME,
        PAYTYPE: updated.PAYTYPE,
      },
    });
  } catch (err: any) {
    console.error("update cpay error", err);
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "รหัสซ้ำในระบบ" }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to update cpay", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

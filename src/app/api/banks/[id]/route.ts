import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const body = await req.json();
    const idbank = body.idbank ? String(body.idbank).trim() : "";
    const namebank = body.namebank ? String(body.namebank).trim() : null;

    if (!idbank) {
      return NextResponse.json({ error: "idbank is required" }, { status: 400 });
    }

    const updated = await prisma.bank.update({
      where: { id },
      data: {
        IDBANK: idbank,
        NAMEBANK: namebank,
      },
    });

    const serializedBank = {
      ...updated,
      id: updated.id.toString(),
    };

    return NextResponse.json({ bank: serializedBank });
  } catch (err: any) {
    console.error("banks PUT error", err);
    return NextResponse.json(
      { error: "Failed to update bank", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const bank = await prisma.bank.findUnique({ where: { id } });
    if (!bank) {
      return NextResponse.json({ error: "Bank not found" }, { status: 404 });
    }

    const salaryCount = await prisma.salary.count({ where: { BANKID: bank.id } });
    if (salaryCount > 0) {
      return NextResponse.json(
        { error: "บัญชีถูกใช้งานแล้ว ลบไม่ได้" },
        { status: 400 },
      );
    }

    await prisma.bank.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("banks DELETE error", err);
    return NextResponse.json(
      { error: "Failed to delete bank", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cid = searchParams.get("cid");
    if (!cid) {
      return NextResponse.json({ error: "cid is required" }, { status: 400 });
    }

    const banks = await prisma.bank.findMany({
      where: { CID: cid },
      orderBy: { id: "asc" },
    });

    const serializedBanks = banks.map((bank) => ({
      ...bank,
      id: bank.id.toString(),
    }));

    return NextResponse.json({ banks: serializedBanks });
  } catch (err: any) {
    console.error("banks GET error", err);
    return NextResponse.json(
      { error: "Failed to load banks", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const cid = String(body.cid || "").trim();
    const idbank = String(body.idbank || "").trim();
    const namebank = body.namebank ? String(body.namebank).trim() : null;

    if (!cid || !idbank) {
      return NextResponse.json({ error: "cid and idbank are required" }, { status: 400 });
    }

    const bank = await prisma.bank.create({
      data: {
        CID: cid,
        IDBANK: idbank,
        NAMEBANK: namebank,
      },
    });

    const banks = await prisma.bank.findMany({
      where: { CID: cid },
      orderBy: { id: "asc" },
    });

    const serializedBank = {
      ...bank,
      id: bank.id.toString(),
    };

    const serializedBanks = banks.map((b) => ({
      ...b,
      id: b.id.toString(),
    }));

    return NextResponse.json({ bank: serializedBank, banks: serializedBanks });
  } catch (err: any) {
    console.error("banks POST error", err);
    return NextResponse.json(
      { error: "Failed to save bank", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

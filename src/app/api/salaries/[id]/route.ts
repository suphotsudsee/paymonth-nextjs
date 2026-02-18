import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

const PNUMBER_MAX_LENGTH = 10;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const salaryId = Number(id);
    if (!Number.isFinite(salaryId) || salaryId <= 0) {
      return NextResponse.json({ error: "Invalid salary id" }, { status: 400 });
    }

    const body = await req.json();
    const cid = String(body?.cid || "").trim();
    const idpay = String(body?.idpay || "").trim();
    const bankIdRaw = body?.bankId ?? body?.bankid;
    let bankId: bigint | null = null;
    if (bankIdRaw !== undefined && bankIdRaw !== null && bankIdRaw !== "") {
      try {
        bankId = BigInt(bankIdRaw);
      } catch {
        return NextResponse.json({ error: "Invalid bank id" }, { status: 400 });
      }
    }
    const pnumber = (body?.pnumber ? String(body.pnumber).trim() : "") || "P000000000";
    const nodeegar = (body?.nodeegar ? String(body.nodeegar).trim() : "") || "1";
    const num = (body?.num ? String(body.num).trim() : "") || "1";
    const monththai = String(body?.monththai || "").padStart(2, "0");
    const yearthai = String(body?.yearthai || "").trim();
    const moneyValue = Number(body?.money ?? 0);

    if (!cid || !idpay || !monththai || !yearthai || Number.isNaN(moneyValue) || !bankId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const status = String(session.status || "").toLowerCase();
    const isLimitedUser = status === "user";
    if (isLimitedUser && session.cid !== cid) {
      return NextResponse.json(
        { error: "Forbidden: cannot update salary for other users" },
        { status: 403 },
      );
    }

    if (pnumber.length > PNUMBER_MAX_LENGTH) {
      return NextResponse.json(
        { error: `PNUMBER must be at most ${PNUMBER_MAX_LENGTH} characters` },
        { status: 400 },
      );
    }

    const current = await prisma.salary.findUnique({
      where: { ID: BigInt(salaryId) },
    });
    if (!current) {
      return NextResponse.json({ error: "Salary record not found" }, { status: 404 });
    }

    if (isLimitedUser && current.CID !== session.cid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const bank = await prisma.bank.findUnique({ where: { id: bankId } });
    if (!bank || bank.CID !== cid) {
      return NextResponse.json({ error: "Invalid bank account for officer" }, { status: 400 });
    }

    const updated = await prisma.salary.update({
      where: { ID: BigInt(salaryId) },
      data: {
        CID: cid,
        IDPAY: idpay,
        BANKID: bankId,
        PNUMBER: pnumber,
        NODEEGAR: nodeegar,
        NUM: num,
        MONTHTHAI: monththai,
        YEARTHAI: yearthai,
        MONEY: moneyValue,
        DUPDATE: new Date(),
      },
    });

    return NextResponse.json({
      item: {
        ID: Number(updated.ID),
        CID: updated.CID,
        IDPAY: updated.IDPAY,
        PNUMBER: updated.PNUMBER,
        NODEEGAR: updated.NODEEGAR,
        NUM: updated.NUM,
        MONTHTHAI: updated.MONTHTHAI,
        YEARTHAI: updated.YEARTHAI,
        MONEY: updated.MONEY.toNumber(),
        BANKID: updated.BANKID ? updated.BANKID.toString() : null,
      },
    });
  } catch (err: any) {
    console.error("update salary error", err);
    return NextResponse.json(
      { error: "Failed to update salary", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}


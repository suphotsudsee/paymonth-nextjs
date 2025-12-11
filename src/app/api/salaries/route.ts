import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

// POST /api/salaries
// Body: { cid, idpay, bankId, pnumber?, nodeegar?, num?, monththai, yearthai, money }
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
        { error: "Forbidden: cannot create salary for other users" },
        { status: 403 },
      );
    }

    const bank = await prisma.bank.findUnique({ where: { id: bankId } });
    if (!bank || bank.CID !== cid) {
      return NextResponse.json({ error: "Invalid bank account for officer" }, { status: 400 });
    }

    const created = await prisma.salary.create({
      data: {
        CID: cid,
        IDPAY: idpay,
        BANKID: bankId,
        PNUMBER: pnumber,
        NODEEGAR: nodeegar,
        NUM: num,
        MONTHTHAI: monththai,
        YEARTHAI: yearthai,
        MONEY: new Prisma.Decimal(moneyValue),
        DUPDATE: new Date(),
      },
    });

    return NextResponse.json({
      item: {
        ID: Number(created.ID),
        CID: created.CID,
        IDPAY: created.IDPAY,
        PNUMBER: created.PNUMBER,
        NODEEGAR: created.NODEEGAR,
        NUM: created.NUM,
        MONTHTHAI: created.MONTHTHAI,
        YEARTHAI: created.YEARTHAI,
        MONEY: created.MONEY.toNumber(),
        BANKID: created.BANKID ? created.BANKID.toString() : null,
      },
    });
  } catch (err: any) {
    console.error("create salary error", err);
    return NextResponse.json(
      { error: "Failed to create salary", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

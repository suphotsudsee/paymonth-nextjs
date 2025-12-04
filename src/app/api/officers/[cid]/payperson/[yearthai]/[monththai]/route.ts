import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

type SlipRow = {
  IDPAY: string;
  PAYNAME: string | null;
  PAYTYPE: string | null;
  MONEY: number | string | null;
};

type OfficerInfo = {
  CID: string;
  NAME: string | null;
  LPOS: string | null;
  NAMESTATION: string | null;
  NAMEMONTH_TH: string | null;
  MONTHTHAI: string;
  YEARTHAI: string;
  IDBANK: string | null;
  NAMEBANK: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string; monththai: string; yearthai: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cid, monththai, yearthai } = await params;
    if (!cid || !monththai || !yearthai) {
      return NextResponse.json({ error: "cid, monththai, and yearthai are required" }, { status: 400 });
    }

    const officerRows = await prisma.$queryRawUnsafe<OfficerInfo[]>(
      `
        SELECT
          officer.CID,
          officer.NAME,
          officer.LPOS,
          station.NAMESTATION,
          cmonth.NAMEMONTH_TH,
          salary.MONTHTHAI,
          salary.YEARTHAI,
          bank.IDBANK,
          bank.NAMEBANK
        FROM salary
          INNER JOIN officer ON salary.CID = officer.CID
          INNER JOIN station ON officer.CODE = station.CODE
          INNER JOIN cmonth ON salary.MONTHTHAI = cmonth.ID
          LEFT JOIN bank ON bank.id = salary.BANKID
        WHERE salary.CID = ? AND salary.MONTHTHAI = ? AND salary.YEARTHAI = ?
        LIMIT 1
      `,
      cid,
      monththai,
      yearthai,
    );

    const officer = officerRows[0] ?? null;

    const rows = await prisma.$queryRawUnsafe<SlipRow[]>(
      `
        SELECT salary.IDPAY, cpay.PAYNAME, cpay.PAYTYPE, salary.MONEY
        FROM salary
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
        WHERE salary.CID = ? AND salary.MONTHTHAI = ? AND salary.YEARTHAI = ? AND salary.IDPAY <> '20004'
        ORDER BY salary.IDPAY ASC
        LIMIT 200
      `,
      cid,
      monththai,
      yearthai,
    );

    const income = rows
      .filter((r) => r.PAYTYPE === "1")
      .map((r) => ({ ...r, MONEY: Number(r.MONEY ?? 0) }))
      .sort((a, b) => a.IDPAY.localeCompare(b.IDPAY));
    const outcome = rows
      .filter((r) => r.PAYTYPE !== "1")
      .map((r) => ({ ...r, MONEY: Number(r.MONEY ?? 0) }))
      .sort((a, b) => a.IDPAY.localeCompare(b.IDPAY));

    const totalIncome = income.reduce((sum, r) => sum + Number(r.MONEY ?? 0), 0);
    const totalOutcome = outcome.reduce((sum, r) => sum + Number(r.MONEY ?? 0), 0);
    const balance = totalIncome - totalOutcome;

    return NextResponse.json({
      officer: officer
        ? {
            cid: officer.CID,
            name: officer.NAME,
            position: officer.LPOS,
            station: officer.NAMESTATION,
            monththai: officer.MONTHTHAI,
            yearthai: officer.YEARTHAI,
            monthName: officer.NAMEMONTH_TH,
            bankAccount: officer.IDBANK ?? null,
            bankName: officer.NAMEBANK ?? null,
          }
        : null,
      income,
      outcome,
      totalIncome,
      totalOutcome,
      balance,
    });
  } catch (err: any) {
    console.error("payperson slip load error", err);
    return NextResponse.json(
      { error: "Failed to load payperson slip", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

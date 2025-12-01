import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cid } = await params;
    if (!cid) {
      return NextResponse.json({ error: "CID is required" }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<
      {
        CID: string;
        IDCOOP: string | null;
        IDMAN: string | null;
        NO: string | null;
        CODE: string | null;
        NAME: string | null;
        SEX: string | null;
        LPOS: string | null;
        DUPDATE: string | null;
        MOBILE: string | null;
        EMAIL: string | null;
        NAMESTATION: string | null;
      }[]
    >(
      `
        SELECT o.CID, o.IDCOOP, o.IDMAN, o.NO, o.CODE, o.NAME, o.SEX, o.LPOS, o.DUPDATE, o.MOBILE, o.EMAIL, s.NAMESTATION
        FROM officer o
        LEFT JOIN station s ON o.CODE = s.CODE
        WHERE o.CID = ?
        LIMIT 1
      `,
      cid,
    );

    const officer = rows[0];

    if (!officer) {
      return NextResponse.json({ error: "Officer not found" }, { status: 404 });
    }

    return NextResponse.json({ officer });
  } catch (err: any) {
    console.error("officer detail error", err);
    return NextResponse.json(
      { error: "Failed to load officer detail", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ cid: string }> },
) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cid } = await params;
    if (!cid) {
      return NextResponse.json({ error: "CID is required" }, { status: 400 });
    }

    const body = await req.json();
    const toNull = (v: any) =>
      v === undefined || v === null || String(v).trim() === "" ? null : String(v).trim();

    const updateValues = {
      IDCOOP: toNull(body.IDCOOP),
      IDMAN: toNull(body.IDMAN),
      NO: toNull(body.NO),
      CODE: toNull(body.CODE),
      NAME: toNull(body.NAME),
      SEX: toNull(body.SEX),
      LPOS: toNull(body.LPOS),
      DUPDATE: toNull(body.DUPDATE),
      MOBILE: toNull(body.MOBILE),
      EMAIL: toNull(body.EMAIL),
    };

    await prisma.$executeRawUnsafe(
      `
        UPDATE officer
        SET IDCOOP = ?, IDMAN = ?, NO = ?, CODE = ?, NAME = ?, SEX = ?, LPOS = ?, DUPDATE = ?, MOBILE = ?, EMAIL = ?
        WHERE CID = ?
      `,
      updateValues.IDCOOP,
      updateValues.IDMAN,
      updateValues.NO,
      updateValues.CODE,
      updateValues.NAME,
      updateValues.SEX,
      updateValues.LPOS,
      updateValues.DUPDATE,
      updateValues.MOBILE,
      updateValues.EMAIL,
      cid,
    );

    const updated = await prisma.$queryRawUnsafe<
      {
        CID: string;
        IDCOOP: string | null;
        IDMAN: string | null;
        NO: string | null;
        CODE: string | null;
        NAME: string | null;
        SEX: string | null;
        LPOS: string | null;
        DUPDATE: string | null;
        MOBILE: string | null;
        EMAIL: string | null;
        NAMESTATION: string | null;
      }[]
    >(
      `
        SELECT o.CID, o.IDCOOP, o.IDMAN, o.NO, o.CODE, o.NAME, o.SEX, o.LPOS, o.DUPDATE, o.MOBILE, o.EMAIL, s.NAMESTATION
        FROM officer o
        LEFT JOIN station s ON o.CODE = s.CODE
        WHERE o.CID = ?
        LIMIT 1
      `,
      cid,
    );

    return NextResponse.json({ officer: updated[0] ?? null });
  } catch (err: any) {
    console.error("officer update error", err);
    return NextResponse.json(
      { error: "Failed to update officer", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

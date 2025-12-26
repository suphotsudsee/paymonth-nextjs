import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { pid } = await req.json().catch(() => ({}));
    const cid = typeof pid === "string" ? pid.trim() : "";
    if (!cid) {
      return NextResponse.json({ error: "missing pid" }, { status: 400 });
    }

    const rows = (await prisma.$queryRawUnsafe(
      "SELECT id, cid, accessLevel, fname, lname, status FROM user WHERE cid = ? LIMIT 1",
      cid,
    )) as {
      id: number;
      cid: string;
      accessLevel: number;
      fname: string;
      lname: string;
      status: string | null;
    }[];
    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: "user_not_found", cid }, { status: 404 });
    }

    const token = await signSession({
      id: user.id,
      cid: user.cid,
      accessLevel: user.accessLevel,
      fname: user.fname,
      lname: user.lname,
      status: user.status ?? undefined,
    });

    const res = NextResponse.json({
      user,
      message: "ThaiID login successful",
    });

    res.cookies.set("session", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
    });

    return res;
  } catch (error: any) {
    console.error("ThaiID login error", error);
    return NextResponse.json(
      { error: "login_failed", detail: String(error?.message || error) },
      { status: 500 },
    );
  }
}

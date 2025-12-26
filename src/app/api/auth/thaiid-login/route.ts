import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signSession } from "@/lib/auth";

type LoginAttempt = {
  username: string | null;
  password: string | null;
  logined: "Y" | "N";
  ipv4: string | null;
};

function clampString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.length > max ? value.slice(0, max) : value;
}

function extractClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  let ip = (forwarded ? forwarded.split(",")[0] : realIp || "").trim();
  if (!ip) return null;
  if (ip === "::1") return "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.includes(".") && ip.includes(":")) ip = ip.split(":")[0];
  return ip;
}

async function logLoginAttempt(attempt: LoginAttempt) {
  try {
    await prisma.$executeRawUnsafe(
      "INSERT INTO useronline (username, password, logined, ipv4, logindate) VALUES (?, ?, ?, ?, NOW())",
      attempt.username,
      attempt.password,
      attempt.logined,
      attempt.ipv4,
    );
  } catch (error) {
    console.error("Login audit insert failed", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { pid } = await req.json().catch(() => ({}));
    const clientIp = extractClientIp(req);
    const ipv4 = clientIp;
    const cid = typeof pid === "string" ? pid.trim() : "";
    const username = clampString(cid || pid, 50);
    if (!cid) {
      await logLoginAttempt({
        username,
        password: null,
        logined: "N",
        ipv4,
      });
      return NextResponse.json({ error: "missing pid" }, { status: 400 });
    }

    const rows = (await prisma.$queryRawUnsafe(
      "SELECT id, cid, accessLevel, fname, lname, status FROM user WHERE cid = ? LIMIT 1",
      cid,
    )) as { id: number; cid: string; accessLevel: number; fname: string; lname: string; status: string | null }[];
    const user = rows[0];

    if (!user) {
      await logLoginAttempt({
        username,
        password: null,
        logined: "N",
        ipv4,
      });
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

    await logLoginAttempt({
      username,
      password: null,
      logined: "Y",
      ipv4,
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

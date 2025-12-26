import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signSession } from "@/lib/auth";

type LoginAttempt = {
  username: string | null;
  password: string | null;
  logined: "Y" | "N";
  ipv4: number | null;
};

function clampString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.length > max ? value.slice(0, max) : value;
}

function extractClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  let ip = (forwarded ? forwarded.split(",")[0] : realIp || req.ip || "").trim();
  if (!ip) return null;
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (ip.includes(".") && ip.includes(":")) ip = ip.split(":")[0];
  return ip;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((part) => Number.parseInt(part, 10));
  if (nums.some((num) => Number.isNaN(num) || num < 0 || num > 255)) return null;
  return (nums[0] * 256 ** 3 + nums[1] * 256 ** 2 + nums[2] * 256 + nums[3]) >>> 0;
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
    const ipv4 = clientIp ? ipv4ToInt(clientIp) : null;
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

    const rows = await prisma.$queryRawUnsafe<
      { id: number; cid: string; accessLevel: number; fname: string; lname: string; status: string | null }[]
    >(
      "SELECT id, cid, accessLevel, fname, lname, status FROM user WHERE cid = ? LIMIT 1",
      cid,
    );
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

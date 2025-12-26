import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signSession } from "@/lib/auth";

async function exchangeToken(code: string, redirectUri: string) {
  const clientId =
    process.env.AUTH_THAIID_ID || process.env.THAID_CLIENT_ID || "";
  const clientSecret =
    process.env.AUTH_THAIID_SECRET || process.env.THAID_CLIENT_SECRET || "";
  const tokenUrl =
    process.env.AUTH_THAIID_TOKEN_URL || process.env.THAID_API_TOKEN || "";
  const scope =
    process.env.AUTH_THAIID_SCOPE || process.env.THAID_SCOPE || "pid";
  const apiKey =
    process.env.AUTH_THAIID_API_KEY || process.env.THAID_API_KEY || undefined;

  if (!clientId || !clientSecret || !tokenUrl) {
    throw new Error("missing ThaiID configuration");
  }

  const authBasic = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  async function requestToken(url: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authBasic}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        ...(apiKey ? { "X-API-Key": apiKey } : {}),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
        scope,
      }),
    });
    const raw = await res.text();
    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      json = raw;
    }
    return { res, json };
  }

  let { res: tokenRes, json: tokenJson } = await requestToken(tokenUrl);

  // Retry with trailing slash if 404 (some gateways require it)
  if (tokenRes.status === 404 && !tokenUrl.endsWith("/")) {
    const retry = await requestToken(`${tokenUrl}/`);
    if (retry.res.ok || retry.res.status !== 404) {
      tokenRes = retry.res;
      tokenJson = retry.json;
    }
  }

  if (!tokenRes.ok) {
    const error = typeof tokenJson === "object" ? tokenJson : { body: tokenJson };
    throw new Error(`token_error:${tokenRes.status}:${JSON.stringify(error)}`);
  }

  return tokenJson;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const origin =
    forwardedProto && forwardedHost
      ? `${forwardedProto}://${forwardedHost}`
      : url.origin;

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) {
    return NextResponse.json({ error: "missing code" }, { status: 400 });
  }

  const redirectUri =
    process.env.AUTH_THAIID_CALLBACK ||
    `${origin}/callback`;

  try {
    const token = await exchangeToken(code, redirectUri);
    const pid =
      typeof token === "object" && token !== null ? (token as any).pid : null;

    if (typeof pid !== "string" || !pid) {
      return NextResponse.json({ error: "pid_missing_in_token", token }, { status: 400 });
    }

    const rows = (await prisma.$queryRawUnsafe(
      "SELECT id, cid, accessLevel, fname, lname, status FROM user WHERE cid = ? LIMIT 1",
      pid,
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
      return NextResponse.json(
        { error: "not_found", message: `ไม่พบข้อมูล ${pid} ในฐานข้อมูล`, pid },
        { status: 404 },
      );
    }

    const tokenSession = await signSession({
      id: user.id,
      cid: user.cid,
      accessLevel: user.accessLevel,
      fname: user.fname,
      lname: user.lname,
      status: user.status ?? undefined,
    });

    const statusLower = (user.status || "").toLowerCase();
    const defaultPath =
      statusLower === "user" ? `/officers/${user.cid}` : "/officers";

    let targetPath = defaultPath;
    if (state && statusLower !== "user") {
      try {
        targetPath = decodeURIComponent(state);
      } catch {
        targetPath = state;
      }
    }
    // Ensure absolute URL for redirect
    const targetUrl = new URL(targetPath, origin).toString();

    const res = NextResponse.redirect(targetUrl);
    res.cookies.set("session", tokenSession, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
    });
    return res;
  } catch (error: any) {
    console.error("[thaiid][callback] error", error);
    return NextResponse.json(
      {
        error: "callback_failed",
        detail: String(error?.message || error),
      },
      { status: 500 },
    );
  }
}

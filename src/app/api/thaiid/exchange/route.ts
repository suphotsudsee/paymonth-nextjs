import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code : "";
    const state = typeof body.state === "string" ? body.state : undefined;
    const extra = body.extra ?? {};

    if (!code) {
      return NextResponse.json({ error: "missing code" }, { status: 400 });
    }

    const clientId =
      process.env.AUTH_THAIID_ID || process.env.THAID_CLIENT_ID || "";
    const clientSecret =
      process.env.AUTH_THAIID_SECRET || process.env.THAID_CLIENT_SECRET || "";
    const tokenUrl =
      process.env.AUTH_THAIID_TOKEN_URL || process.env.THAID_API_TOKEN || "";
    const callbackUrl =
      process.env.AUTH_THAIID_CALLBACK ||
      process.env.THAID_CALLBACK_URL ||
      (process.env.NEXTAUTH_URL
        ? `${process.env.NEXTAUTH_URL}/callback`
        : "");
    const userinfoUrl =
      process.env.AUTH_THAIID_USERINFO_URL ||
      process.env.THAID_API_USERINFO ||
      "";
    const apiKey =
      process.env.AUTH_THAIID_API_KEY || process.env.THAID_API_KEY || undefined;

    if (!clientId || !clientSecret || !tokenUrl || !callbackUrl) {
      return NextResponse.json(
        { error: "missing ThaiID configuration" },
        { status: 500 },
      );
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
          redirect_uri: callbackUrl,
          code,
          scope:
            process.env.AUTH_THAIID_SCOPE || process.env.THAID_SCOPE || "",
          ...extra,
        }),
      });
      const raw = await res.text();
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        json = raw;
      }
      return { res, raw, json };
    }

    let { res: tokenRes, json: tokenJson } = await requestToken(tokenUrl);

    // If 404, retry with a trailing slash (some gateways require it)
    if (tokenRes.status === 404 && !tokenUrl.endsWith("/")) {
      const retryUrl = `${tokenUrl}/`;
      const retry = await requestToken(retryUrl);
      if (retry.res.ok || retry.res.status !== 404) {
        tokenRes = retry.res;
        tokenJson = retry.json;
      }
    }

    if (!tokenRes.ok) {
      return NextResponse.json(
        {
          error: "token_error",
          status: tokenRes.status,
          body: tokenJson,
          tokenUrl,
          callbackUrl,
        },
        { status: 500 },
      );
    }

    let profile: unknown = null;
    const accessToken =
      typeof tokenJson === "object" && tokenJson !== null
        ? // @ts-ignore
          tokenJson.access_token
        : undefined;
    if (userinfoUrl && accessToken) {
      const uiRes = await fetch(userinfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
      });
      const uiRaw = await uiRes.text();
      try {
        profile = JSON.parse(uiRaw);
      } catch {
        profile = uiRaw;
      }
    }

    return NextResponse.json({
      state,
      token: tokenJson,
      profile,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "exchange_failed", detail: String(error) },
      { status: 500 },
    );
  }
}

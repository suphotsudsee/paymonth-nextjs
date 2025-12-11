import NextAuth from "next-auth";

import type { OAuthConfig } from "next-auth/providers";

const isProd = process.env.NODE_ENV === "production";
const verboseAuthLog = !isProd || process.env.NEXTAUTH_DEBUG === "true";

const ThaiIdProvider: OAuthConfig<Record<string, unknown>> = {
  id: "thaiid",
  name: "ThaiID (DOPA Digital ID)",
  // Generic OAuth2 setup; explicit endpoints.
  type: "oauth",
  clientId: process.env.AUTH_THAIID_ID,
  clientSecret: process.env.AUTH_THAIID_SECRET,
  authorization: {
    url:
      process.env.AUTH_THAIID_AUTH_URL ??
      "https://imauth.bora.dopa.go.th/api/v2/oauth2/auth",
    params: {
      scope: process.env.AUTH_THAIID_SCOPE ?? "pid",
      response_type: "code",
    },
  },
  token:
    process.env.AUTH_THAIID_TOKEN_URL ??
    "https://imauth.bora.dopa.go.th/api/v2/oauth2/token",
  userinfo:
    process.env.AUTH_THAIID_USERINFO_URL ??
    "https://imauth.bora.dopa.go.th/api/v2/oauth2/userinfo",
  // Force NextAuth token exchange to use the same redirect URI that was used for the initial auth request.
  redirectProxyUrl:
    process.env.AUTH_THAIID_CALLBACK ??
    `${process.env.NEXTAUTH_URL ?? ""}/callback`,
  checks: ["state"],
  profile(profile: unknown) {
    const data = profile as Record<string, unknown>;
    const citizenIdSource =
      typeof (data as { pid?: unknown }).pid === "string"
        ? (data as { pid?: string }).pid
        : typeof (data as { citizen_id?: unknown }).citizen_id === "string"
          ? (data as { citizen_id?: string }).citizen_id
          : typeof (data as { cid?: unknown }).cid === "string"
            ? (data as { cid?: string }).cid
            : typeof data.sub === "string"
              ? data.sub
              : undefined;

    const name =
      (typeof data.name === "string" && data.name) ||
      (typeof (data as { fullname?: unknown }).fullname === "string" &&
        (data as { fullname?: string }).fullname) ||
      `${(data.given_name as string | undefined) ?? ""} ${(data.family_name as
        | string
        | undefined) ?? ""}`.trim();

    return {
      id: citizenIdSource ?? (data.sub as string),
      name: name || citizenIdSource || (data.sub as string),
      email: (data.email as string | undefined) ?? null,
      citizenId: citizenIdSource,
    };
  },
};

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  debug: !isProd,
  logger: {
    error: (...args) => console.error("[next-auth][error]", ...args),
    warn: (...args) => console.warn("[next-auth][warn]", ...args),
    debug: (...args) => verboseAuthLog && console.debug("[next-auth][debug]", ...args),
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (!verboseAuthLog) return;
      // Avoid logging sensitive PII in production; only log in verbose/dev mode.
      console.log("[thaiid][signin] isNewUser:", isNewUser);
    },
  },
  // Use provider object directly; NextAuth will inject env defaults.
  providers: [ThaiIdProvider],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, profile }) {
      const data = profile as Record<string, unknown> | null | undefined;
      const citizenId =
        typeof (data as { citizenId?: unknown })?.citizenId === "string"
          ? (data as { citizenId?: string }).citizenId
          : typeof (data as { citizen_id?: unknown })?.citizen_id === "string"
            ? (data as { citizen_id?: string }).citizen_id
            : typeof (data as { cid?: unknown })?.cid === "string"
              ? (data as { cid?: string }).cid
              : undefined;

      if (citizenId) {
        token.citizenId = citizenId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { citizenId?: unknown }).citizenId = (token as {
          citizenId?: unknown;
        }).citizenId;
      }
      return session;
    },
  },
});

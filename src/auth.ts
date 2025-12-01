import NextAuth from "next-auth";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    {
      id: "thaiid",
      name: "ThaiID (DOPA Digital ID)",
      type: "oidc",
      // This issuer should expose a standard .well-known/openid-configuration endpoint.
      issuer: process.env.AUTH_THAIID_ISSUER,
      clientId: process.env.AUTH_THAIID_ID,
      clientSecret: process.env.AUTH_THAIID_SECRET,
      authorization: {
        params: {
          scope: "openid profile",
        },
      },
      profile(profile) {
        const data = profile as Record<string, unknown>;
        const citizenIdSource =
          typeof (data as { citizen_id?: unknown }).citizen_id === "string"
            ? (data as { citizen_id?: string }).citizen_id
            : typeof (data as { cid?: unknown }).cid === "string"
              ? (data as { cid?: string }).cid
              : undefined;

        return {
          id: data.sub as string,
          name:
            (typeof data.name === "string" && data.name) ||
            `${(data.given_name as string | undefined) ?? ""} ${(data.family_name as
              | string
              | undefined) ?? ""}`.trim(),
          email: (data.email as string | undefined) ?? null,
          citizenId: citizenIdSource,
        };
      },
    },
  ],
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

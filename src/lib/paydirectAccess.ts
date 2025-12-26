import type { AppSession } from "@/lib/session";

type AccessClause = {
  clause: string;
  params: Array<string | number>;
};

export const buildPaydirectAccessClause = (
  session: AppSession,
  aliases?: { paydirect?: string; officer?: string },
): AccessClause => {
  const paydirectAlias = aliases?.paydirect ?? "paydirect";
  const officerAlias = aliases?.officer ?? "officer";

  if (session.role === "ADMIN") {
    return { clause: "1=1", params: [] };
  }

  if (session.role === "EDITOR") {
    if (!session.orgId) return { clause: "1=0", params: [] };
    return { clause: `${officerAlias}.CODE = ?`, params: [session.orgId] };
  }

  return { clause: `${paydirectAlias}.C = ?`, params: [session.cid] };
};

export const buildOfficerAccessClause = (
  session: AppSession,
  alias = "officer",
): AccessClause => {
  if (session.role === "ADMIN") {
    return { clause: "1=1", params: [] };
  }

  if (session.role === "EDITOR") {
    if (!session.orgId) return { clause: "1=0", params: [] };
    return { clause: `${alias}.CODE = ?`, params: [session.orgId] };
  }

  return { clause: `${alias}.CID = ?`, params: [session.cid] };
};

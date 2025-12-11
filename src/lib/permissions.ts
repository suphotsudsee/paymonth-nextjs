type SessionLike = {
  status?: unknown;
  accessLevel?: unknown;
  cid?: unknown;
};

export const hasAdminAccess = (session: SessionLike | null | undefined): boolean => {
  if (!session) return false;

  const statusStr =
    typeof session?.status === "string"
      ? session.status.toLowerCase()
      : String(session?.status ?? "").toLowerCase();
  if (statusStr.includes("admin") || statusStr.includes("manager")) return true;

  const level = Number(session?.accessLevel);
  return Number.isFinite(level) && level >= 1;
};

export const canActOnCid = (session: SessionLike | null | undefined, cid: string): boolean => {
  if (!session) return false;
  const normalizedCid = String(cid || "").trim();
  if (!normalizedCid) return false;
  if (hasAdminAccess(session)) return true;

  const sessionCid =
    typeof session.cid === "string" ? session.cid.trim() : String(session.cid ?? "").trim();
  return Boolean(sessionCid) && sessionCid === normalizedCid;
};

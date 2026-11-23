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

/**
 * ดูข้อมูลของ CID อื่นได้เฉพาะบทบาทที่รู้จักว่าเป็นเจ้าหน้าที่ (fail closed):
 * status มี admin / manager / editor หรือ accessLevel >= 1 — เกณฑ์เดียวกับ deriveRole ใน src/lib/session.ts
 * status ว่าง / ไม่รู้จัก / "user" + accessLevel 0 = ผู้ใช้สิทธิ์จำกัด เห็นได้เฉพาะ CID ตัวเอง
 * (การจำกัด editor ตามหน่วยงานเป็นงานแยก TASK_BOARD #2c)
 */
export const isStaff = (session: SessionLike | null | undefined): boolean => {
  if (!session) return false;
  const status = String(session.status ?? "").toLowerCase();
  if (status.includes("admin") || status.includes("manager") || status.includes("editor")) return true;
  const level = Number(session.accessLevel);
  return Number.isFinite(level) && level >= 1;
};

export const canAccessCid = (session: SessionLike | null | undefined, cid: string): boolean => {
  if (!session) return false;
  const target = String(cid ?? "").trim();
  if (!target) return false;
  if (isStaff(session)) return true;
  const own = String(session.cid ?? "").trim();
  return own !== "" && own === target;
};

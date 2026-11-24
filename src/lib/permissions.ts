type SessionLike = {
  status?: unknown;
  accessLevel?: unknown;
  cid?: unknown;
};

export type Role = "ADMIN" | "EDITOR" | "USER";

/**
 * บทบาทดูจาก status อย่างเดียว ไม่ใช้ accessLevel (fail closed)
 * เหตุผล: สำรวจตาราง user บน DB ในเครื่อง 2026-11-24 (12,140 แถว)
 *   status "user"    → accessLevel 1 ถึง 12,128 แถว, 0 อีก 3 แถว
 *   status "manager" → accessLevel 1 (4 แถว) และ 8 (1 แถว)
 *   status "admin"   → accessLevel 9 (2 แถว)
 * accessLevel จึงแยกผู้ใช้ทั่วไปออกจากเจ้าหน้าที่ไม่ได้ — ถ้าใช้ "accessLevel >= 1" ผู้ใช้ทั่วไปเกือบทุกคนจะได้สิทธิ์เจ้าหน้าที่
 * เทียบ status แบบตรงตัว (ไม่สนตัวพิมพ์/ช่องว่างหัวท้าย) ไม่ใช่ substring — ช่อง status ในหน้าจัดการผู้ใช้เป็นข้อความอิสระ
 * ถ้าใช้ includes ค่าอย่าง "not-admin" / "former-manager" จะได้สิทธิ์ admin
 * status ว่าง/ไม่รู้จัก (เช่น "นางสาว", "๊user") = USER
 */
const ADMIN_STATUSES = new Set(["admin", "manager"]);
const EDITOR_STATUSES = new Set(["editor"]);

export const roleOf = (session: SessionLike | null | undefined): Role => {
  const status = String(session?.status ?? "").trim().toLowerCase();
  if (ADMIN_STATUSES.has(status)) return "ADMIN";
  if (EDITOR_STATUSES.has(status)) return "EDITOR";
  return "USER";
};

/** จัดการผู้ใช้ / ดูประวัติ login / จัดการบัญชีธนาคาร: admin และ manager เท่านั้น */
export const hasAdminAccess = (session: SessionLike | null | undefined): boolean =>
  !!session && roleOf(session) === "ADMIN";

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
 * งานคลังและการดูข้อมูลของ CID อื่น: admin / manager / editor (ดู roleOf)
 * ผู้ใช้ทั่วไปเห็นได้เฉพาะ CID ตัวเอง (การจำกัด editor ตามหน่วยงานเป็นงานแยก TASK_BOARD #2c)
 */
export const isStaff = (session: SessionLike | null | undefined): boolean =>
  !!session && roleOf(session) !== "USER";

export const canAccessCid = (session: SessionLike | null | undefined, cid: string): boolean => {
  if (!session) return false;
  const target = String(cid ?? "").trim();
  if (!target) return false;
  if (isStaff(session)) return true;
  const own = String(session.cid ?? "").trim();
  return own !== "" && own === target;
};

// กุญแจสำหรับเซ็น/ตรวจ JWT session และ HMAC ของ captcha (src/lib/auth.ts)
// ไม่มีค่า fallback: ถ้าไม่ตั้ง AUTH_SECRET หรือตั้งเป็นค่าที่หลุดแล้ว ระบบจะไม่ออก/ไม่รับ session เลย (fail closed)
// ไฟล์นี้ไม่ import อะไร เพื่อให้ใช้ได้ทั้งใน middleware (edge runtime) และในเทสต์

// HS256 ใช้ HMAC-SHA256: กุญแจควรยาวอย่างน้อยเท่า output ของ hash (32 ไบต์, RFC 7518 ข้อ 3.2)
export const MIN_SECRET_BYTES = 32;

// ค่าที่เคยฝังเป็น fallback ใน src/lib/auth.ts และอยู่ใน git history แล้ว — ใครเห็น repo ก็ปลอม session ได้
// ห้ามใช้เป็น AUTH_SECRET อีก (PRD ข้อ 8.5)
const LEAKED_SECRETS = new Set([
  "8f3a1e9c4b7d20568f3a1e9c4b7d20568f3a1e9c4b7d20568f3a1e9c4b7d2056",
]);

export class AuthSecretError extends Error {
  constructor(reason: string) {
    super(
      `AUTH_SECRET ${reason}. Set a new random value in .env, e.g. ` +
        `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
    );
    this.name = "AuthSecretError";
  }
}

export function validateAuthSecret(raw: string | undefined): Uint8Array<ArrayBuffer> {
  const value = (raw ?? "").trim();
  if (!value) throw new AuthSecretError("is not set");
  if (LEAKED_SECRETS.has(value)) throw new AuthSecretError("is a publicly known value (old hardcoded fallback)");
  const bytes = new TextEncoder().encode(value);
  if (bytes.length < MIN_SECRET_BYTES) {
    throw new AuthSecretError(`is too short (${bytes.length} bytes, need at least ${MIN_SECRET_BYTES})`);
  }
  return bytes;
}

let cached: Uint8Array<ArrayBuffer> | null = null;

// อ่านตอนใช้งานจริง (ไม่ใช่ตอน import) เพื่อให้ next build ผ่านได้แม้ยังไม่ตั้งค่า และให้ error ชัดเจนตอน runtime
export function getAuthSecretKey(): Uint8Array<ArrayBuffer> {
  if (!cached) cached = validateAuthSecret(process.env.AUTH_SECRET);
  return cached;
}

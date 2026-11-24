import prisma from "@/lib/prisma";
import { LEADING_SPACE_KEYS_SQL } from "@/lib/keyJoin";

// ตรวจว่าใช้ join แบบเร็ว (src/lib/keyJoin.ts) ได้หรือไม่ แล้วจำผลไว้
// 5 นาที: การตรวจอ่าน index ของ salary ทั้งก้อน (~100–150 ms บน DB local) ไม่ควรทำทุกคำขอ
// และ route ของแอปทุกตัว trim ก่อนเขียนอยู่แล้ว แถวที่มีเว้นวรรคนำหน้าจะมาได้จากการ import ตรง/ระบบเดิมเท่านั้น
const CACHE_MS = 5 * 60 * 1000;
let cached: { at: number; trimmed: boolean } | null = null;

export async function salaryKeysAreTrimmed(): Promise<boolean> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.trimmed;
  const rows = (await prisma.$queryRawUnsafe(LEADING_SPACE_KEYS_SQL)) as { n: bigint | number }[];
  const trimmed = Number(rows?.[0]?.n ?? 1) === 0;
  if (!trimmed) {
    console.warn("salary/regisdeegar มี key ขึ้นต้นด้วยเว้นวรรค — รายงานใช้ join แบบ TRIM ทั้งสองฝั่ง (ช้ากว่า) จนกว่าจะแก้ข้อมูล");
  }
  cached = { at: Date.now(), trimmed };
  return trimmed;
}

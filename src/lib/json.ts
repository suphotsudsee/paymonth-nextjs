// แปลงค่า BIGINT จาก Prisma ให้ส่งเป็น JSON ได้โดยไม่เสียความแม่นยำ
// อยู่ในช่วงที่ Number แทนได้ตรง (±2^53 − 1) → number; เกินกว่านั้น → string ทศนิยม (ไม่ปัดเศษเงียบๆ)
// ไฟล์นี้ไม่ import อะไร เพื่อให้เทสต์ import ตรงได้
export function bigintToJson(value: bigint | number | null | undefined): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const asNumber = Number(value);
  return Number.isSafeInteger(asNumber) && BigInt(asNumber) === value ? asNumber : value.toString();
}

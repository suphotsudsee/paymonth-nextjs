// เงื่อนไข join จากฎีกา (deegar) ไปหา salary / regisdeegar — TASK_BOARD #10
// แบบเร็ว: ไม่ครอบ TRIM() ฝั่ง salary/regisdeegar เพื่อให้ใช้ index ได้ — ถูกต้องเมื่อ key ฝั่งนั้นไม่มีช่องว่างนำหน้า
// แบบเดิม: TRIM ทั้งสองฝั่ง (ใช้ index ไม่ได้ แต่ถูกต้องเสมอ) — ใช้เมื่อพบข้อมูลเก่าที่มีช่องว่างนำหน้า
// TRIM() ของ MariaDB ตัดเฉพาะเว้นวรรค ' ' และช่องว่างท้ายไม่มีผลกับ = (collation PAD SPACE) จึงตรวจแค่ "ขึ้นต้นด้วยเว้นวรรค"
// ไม่มี import เพื่อให้เทสต์ import ตรงได้

export function latestSalaryMatch(keysTrimmed: boolean, s: string, d: string): string {
  return keysTrimmed
    ? `${s}.PNUMBER = TRIM(${d}.PNUMBER) AND ${s}.NODEEGAR = TRIM(${d}.NODEEGAR)`
    : `TRIM(${s}.PNUMBER) = TRIM(${d}.PNUMBER) AND TRIM(${s}.NODEEGAR) = TRIM(${d}.NODEEGAR)`;
}

export function regisdeegarMatch(keysTrimmed: boolean, r: string, d: string): string {
  return keysTrimmed ? `${r}.PNUMBER = TRIM(${d}.PNUMBER)` : `TRIM(${r}.PNUMBER) = TRIM(${d}.PNUMBER)`;
}

// SQL ตรวจว่า key ฝั่งที่ join แบบเร็วไม่มีเว้นวรรคนำหน้า (ต้องได้ 0) — ใช้ทั้งในโค้ดและ prisma/sql/2026-11-24_report_indexes.sql
export const LEADING_SPACE_KEYS_SQL =
  "SELECT (SELECT COUNT(*) FROM salary WHERE PNUMBER LIKE ' %' OR NODEEGAR LIKE ' %') + (SELECT COUNT(*) FROM regisdeegar WHERE PNUMBER LIKE ' %') AS n";

// join จากรายการเงิน (salary) ไปหาฎีกา (deegar) — ค้นหาฎีกาแบบทีละรายการเงิน (PRD 12, TASK_BOARD #16)
// แบบเร็ว: ไม่ครอบ TRIM() ฝั่ง deegar จึงใช้ unique index (PNUMBER, NODEEGAR) ได้ — ถูกต้องเมื่อ key ของ deegar ไม่มีเว้นวรรคนำหน้า
// วัดบน DB local (ฎีกา P680000017, 57 รายการ): TRIM ทั้งสองฝั่ง 0.97 s → แบบเร็ว 0.05 s
export function deegarFromSalaryMatch(deegarKeysTrimmed: boolean, d: string, s: string): string {
  return deegarKeysTrimmed
    ? `${d}.PNUMBER = TRIM(${s}.PNUMBER) AND ${d}.NODEEGAR = TRIM(${s}.NODEEGAR)`
    : `TRIM(${d}.PNUMBER) = TRIM(${s}.PNUMBER) AND TRIM(${d}.NODEEGAR) = TRIM(${s}.NODEEGAR)`;
}

// SQL ตรวจว่า key ของ deegar ไม่มีเว้นวรรคนำหน้า (ต้องได้ 0) — DB local 2026-11-24: 0 แถว
export const DEEGAR_LEADING_SPACE_SQL =
  "SELECT COUNT(*) AS n FROM deegar WHERE PNUMBER LIKE ' %' OR NODEEGAR LIKE ' %'";

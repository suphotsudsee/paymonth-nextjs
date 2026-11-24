// แบ่งหน้ามาตรฐานทุกหน้า (PRD ข้อ 11.1, TASK_BOARD #12) — ใช้ร่วมกันทั้งฝั่งหน้าเว็บและ API

/** ตัวเลือกจำนวนแถวต่อหน้า ตามที่ผู้ใช้กำหนด */
export const PAGE_SIZE_OPTIONS = [5, 10, 15, 50, 100] as const;

/** เพดานแถวต่อหน้าของ API รายการทั่วไป = ตัวเลือกที่มากที่สุด (เดิม 50) */
export const MAX_PAGE_SIZE = 100;

/**
 * แปลง pageSize จาก query string เป็นจำนวนเต็ม 1..max
 * ค่าว่าง/ไม่ใช่ตัวเลข → fallback, ทศนิยมปัดลง
 */
export function clampPageSize(raw: string | null | undefined, fallback: number, max: number = MAX_PAGE_SIZE): number {
  const n = Math.floor(Number(raw));
  if (!raw || !Number.isFinite(n)) return Math.min(max, Math.max(1, fallback));
  return Math.min(max, Math.max(1, n));
}

/**
 * แปลงเลขหน้าจาก query string เป็นจำนวนเต็ม >= 1 ที่ปลอดภัย (ค่าว่าง/ไม่ใช่ตัวเลข/Infinity/เกิน MAX_SAFE_INTEGER → 1)
 * กัน OFFSET เป็น NaN/Infinity ใน SQL (Codex review งาน #12)
 */
export function parsePage(raw: string | null | undefined): number {
  const n = Math.floor(Number(raw));
  return Number.isSafeInteger(n) && n >= 1 ? n : 1;
}

export type PageItem = number | 'gap';

/**
 * เลขหน้าที่จะแสดง: หน้าแรก, หน้าสุดท้าย และหน้าปัจจุบัน ±radius คั่นด้วย 'gap' (…)
 * ช่องว่างที่ข้ามแค่หน้าเดียวจะแสดงเลขหน้านั้นแทน … (… กินที่เท่ากับเลขหน้า)
 * radius 2 = เลขหน้า+… สูงสุด 9 ช่อง (+ ‹ › = 11) อยู่บรรทัดเดียวบนมือถือ 375px ที่ pagination-sm เมื่อซ่อน « » (ตรวจใน browser งาน #12)
 */
export function pageItems(page: number, totalPages: number, radius = 2): PageItem[] {
  if (totalPages <= 0) return [];
  const current = Math.min(Math.max(1, page), totalPages);
  const start = Math.max(1, current - radius);
  const end = Math.min(totalPages, current + radius);
  const items: PageItem[] = [];
  if (start > 1) {
    items.push(1);
    if (start === 3) items.push(2);
    else if (start > 3) items.push('gap');
  }
  for (let p = start; p <= end; p++) items.push(p);
  if (end < totalPages) {
    if (end === totalPages - 2) items.push(totalPages - 1);
    else if (end < totalPages - 2) items.push('gap');
    items.push(totalPages);
  }
  return items;
}

/**
 * ช่วงรายการที่แสดงอยู่ เช่น { from: 11, to: 20 }
 * total 0 หรือหน้าเกินหน้าสุดท้าย (เช่นข้อมูลถูกลบระหว่างเปลี่ยนหน้า → SQL OFFSET ไม่คืนแถว) → 0–0
 */
export function pageRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 };
  const from = (Math.max(1, page) - 1) * pageSize + 1;
  if (from > total) return { from: 0, to: 0 };
  return { from, to: Math.min(from + pageSize - 1, total) };
}

/**
 * หน้าปัจจุบันเกินหน้าสุดท้าย (ข้อมูลลดลงระหว่างเปลี่ยนหน้า) → ควรไปหน้าไหน
 * คืน null ถ้าไม่ต้องแก้ หรือเคยลองแก้คู่ (page, totalPages) นี้แล้ว — ลองครั้งเดียว ถ้าโหลดไม่สำเร็จจะไม่วนยิงซ้ำ
 */
export function pageCorrection(
  page: number,
  totalPages: number,
  disabled: boolean,
  lastAttempt: string | null,
): { target: number; key: string } | null {
  if (disabled || totalPages <= 0 || page <= totalPages) return null;
  const key = `${page}/${totalPages}`;
  if (key === lastAttempt) return null;
  return { target: totalPages, key };
}

// แบ่งหน้ารายงานที่เรียงตาม งวด (ปี desc, เดือน desc) ก่อนแล้วค่อยเรียงอย่างอื่นในงวด
// แทนที่จะให้ DB เรียงทุกกลุ่มทั้งตารางแล้วตัดด้วย LIMIT/OFFSET: หาว่าแถวที่ offset..offset+pageSize-1 อยู่ในงวดไหน
// แล้วเรียงเฉพาะงวดเหล่านั้น ผลเท่าเดิมเพราะลำดับระดับบนสุดคืองวด (TASK_BOARD #10)
// ไม่มี import เพื่อให้เทสต์ import ตรงได้

export type PeriodCount = { year: string; month: string; count: number };

export function pickPeriodsForPage(
  periods: PeriodCount[], // เรียงตามลำดับเดียวกับรายงานแล้ว
  offset: number,
  pageSize: number,
): { periods: PeriodCount[]; offsetWithin: number } {
  const picked: PeriodCount[] = [];
  let before = 0; // จำนวนแถวของงวดก่อนหน้างวดแรกที่เลือก
  let seen = 0;
  const end = offset + pageSize;
  for (const p of periods) {
    const start = seen;
    seen += p.count;
    if (p.count <= 0) continue;
    if (seen <= offset) continue; // ทั้งงวดอยู่ก่อนหน้านี้
    if (start >= end) break; // เลยหน้านี้ไปแล้ว
    if (picked.length === 0) before = start;
    picked.push(p);
  }
  return { periods: picked, offsetWithin: picked.length ? offset - before : 0 };
}

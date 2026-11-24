// แบ่งหน้ามาตรฐาน (PRD 11.1, TASK_BOARD #12)
// Node 24 import ไฟล์ .ts ได้ตรงๆ (เหมือน tests/report-queries.test.mjs)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(root, p), "utf8");
const mod = await import("../src/lib/pagination.ts");
const { PAGE_SIZE_OPTIONS, MAX_PAGE_SIZE, clampPageSize, parsePage, pageItems, pageRange, pageCorrection } = mod;

test("page size options are exactly 5/10/15/50/100 and the API cap is the largest", () => {
  assert.deepEqual([...PAGE_SIZE_OPTIONS], [5, 10, 15, 50, 100]);
  assert.equal(MAX_PAGE_SIZE, 100);
});

test("clampPageSize keeps 1..max and falls back on junk", () => {
  assert.equal(clampPageSize("100", 10), 100);
  assert.equal(clampPageSize("500", 10), 100);
  assert.equal(clampPageSize("0", 10), 1);
  assert.equal(clampPageSize("-3", 10), 1);
  assert.equal(clampPageSize("abc", 10), 10);
  assert.equal(clampPageSize(null, 10), 10);
  assert.equal(clampPageSize("", 20), 20);
  assert.equal(clampPageSize("12.9", 10), 12);
  assert.equal(clampPageSize("300", 50, 200), 200);
});

test("parsePage gives a safe integer >= 1 (no NaN/Infinity OFFSET)", () => {
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage("3.7"), 3);
  for (const bad of [null, undefined, "", "0", "-2", "abc", "Infinity", "-Infinity", "NaN", "1e400", "9007199254740993"]) {
    assert.equal(parsePage(bad), 1, String(bad));
  }
});

test("pageItems shows first/last, current ±2 and gaps", () => {
  assert.deepEqual(pageItems(1, 0), []);
  assert.deepEqual(pageItems(1, 1), [1]);
  assert.deepEqual(pageItems(1, 5), [1, 2, 3, 4, 5]);
  assert.deepEqual(pageItems(1, 20), [1, 2, 3, "gap", 20]);
  assert.deepEqual(pageItems(10, 20), [1, "gap", 8, 9, 10, 11, 12, "gap", 20]);
  assert.deepEqual(pageItems(20, 20), [1, "gap", 18, 19, 20]);
  // gap ของหน้าเดียวแสดงเลขแทน
  assert.deepEqual(pageItems(4, 20), [1, 2, 3, 4, 5, 6, "gap", 20]);
  assert.deepEqual(pageItems(17, 20), [1, "gap", 15, 16, 17, 18, 19, 20]);
  // page เกินช่วง ถูกดึงกลับ
  assert.deepEqual(pageItems(99, 3), [1, 2, 3]);
});

test("pageRange", () => {
  assert.deepEqual(pageRange(1, 10, 0), { from: 0, to: 0 });
  assert.deepEqual(pageRange(1, 10, 7), { from: 1, to: 7 });
  assert.deepEqual(pageRange(3, 10, 25), { from: 21, to: 25 });
  assert.deepEqual(pageRange(2, 100, 250), { from: 101, to: 200 });
  // หน้าเกินหน้าสุดท้าย (ข้อมูลหายระหว่างเปลี่ยนหน้า) ไม่แสดงช่วงที่ไม่มีอยู่จริง
  assert.deepEqual(pageRange(3, 10, 15), { from: 0, to: 0 });
  assert.deepEqual(pageRange(2, 10, 15), { from: 11, to: 15 });
});

test("pageCorrection jumps to the last page once and never loops on a failed fetch", () => {
  assert.equal(pageCorrection(2, 5, false, null), null); // อยู่ในช่วง
  assert.equal(pageCorrection(3, 0, false, null), null); // ไม่มีข้อมูล
  assert.equal(pageCorrection(3, 2, true, null), null); // กำลังโหลด
  const first = pageCorrection(3, 2, false, null);
  assert.deepEqual(first, { target: 2, key: "3/2" });
  // โหลดหน้า 2 ไม่สำเร็จ: parent ยังค้าง page 3 / totalPages 2 → ห้ามยิงซ้ำ แม้ disabled จะสลับ true→false
  assert.equal(pageCorrection(3, 2, true, first.key), null);
  assert.equal(pageCorrection(3, 2, false, first.key), null);
  // ข้อมูลลดลงอีก (คู่ใหม่) ลองใหม่ได้ครั้งเดียว
  assert.deepEqual(pageCorrection(3, 1, false, first.key), { target: 1, key: "3/1" });
});

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

test("every paged list page uses the shared <Pagination> and no hand-made page buttons remain", () => {
  const pages = walk(join(root, "src/app/(dashboard)"))
    .filter((p) => p.endsWith("page.tsx"))
    .map((p) => relative(root, p).replaceAll("\\", "/"));
  const paged = pages.filter((p) => /totalPages/.test(read(p)));
  assert.ok(paged.length >= 24, `expected the paged pages, got ${paged.length}`);
  for (const p of paged) {
    const src = read(p);
    assert.ok(/<Pagination\b/.test(src), `${p} must render <Pagination>`);
    assert.ok(!/pageWindow/.test(src), `${p} still builds its own page buttons`);
  }
});

test("APIs that capped page size at 50 now allow MAX_PAGE_SIZE (100)", () => {
  const api = walk(join(root, "src/app/api"))
    .filter((p) => p.endsWith("route.ts"))
    .map((p) => relative(root, p).replaceAll("\\", "/"));
  for (const p of api) {
    assert.ok(!/Math\.min\(50,/.test(read(p)), `${p} still caps pageSize at 50`);
    // route ที่ใช้ clampPageSize (แก้ในงาน #12) ต้องอ่านเลขหน้าด้วย parsePage ด้วย
    if (/clampPageSize\(/.test(read(p))) assert.match(read(p), /parsePage\(/, `${p} must parse page with parsePage`);
  }
});

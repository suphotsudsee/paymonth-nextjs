// การแก้ที่ทำตรงบน server แล้วย้ายเข้า repo (PRD 12, TASK_BOARD #16)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const { attachmentHeader } = await import("../src/lib/attachment.ts");
const { payvoucherWhere, PAYVOUCHER_FIELD_MAP } = await import("../src/lib/payvouchersQuery.ts");

test("attachmentHeader: ASCII fallback + RFC 5987 UTF-8 name for Thai filenames", () => {
  const h = attachmentHeader("ฎีกา_P680000017_2026-11-24", "ktbdeegar-export");
  assert.match(h, /^attachment; filename="[\x20-\x7E]+\.xlsx"; filename\*=UTF-8''/);
  assert.ok(h.includes(`filename*=UTF-8''${encodeURIComponent("ฎีกา_P680000017_2026-11-24.xlsx")}`));
  assert.doesNotMatch(h.split(";")[1], /[^\x20-\x7E]/, "plain filename must be ASCII only");
  // RFC 5987 attr-char ไม่มี ' ( ) * → ต้อง escape (encodeURIComponent ไม่ทำให้)
  const special = attachmentHeader("ฎีกา (ครั้งที่ 2) O'Neil*", "x");
  const star = special.slice(special.indexOf("filename*=UTF-8''") + "filename*=UTF-8''".length);
  assert.match(star, /^[A-Za-z0-9!#$&+\-.^_`|~%]+$/, star);
  assert.ok(star.includes("%28") && star.includes("%29") && star.includes("%27") && star.includes("%2A"));
  assert.equal(decodeURIComponent(star), "ฎีกา (ครั้งที่ 2) O'Neil*.xlsx");
  // ชื่อเป็นไทยล้วน → fallback
  assert.match(attachmentHeader("ทะเบียน", "payvouchers-export"), /filename="_\.xlsx"|filename="payvouchers-export\.xlsx"/);
  // quote/backslash ห้ามหลุดเข้า header
  assert.match(attachmentHeader('a"b\\c', "x"), /filename="a_b_c\.xlsx"/);
  // ชื่อ ASCII ธรรมดาไม่เปลี่ยน
  assert.match(attachmentHeader("31310248649_2026-11-24_10:00:00", "x"), /filename="31310248649_2026-11-24_10:00:00\.xlsx"/);
});

test("payvoucherWhere: date range always, search column only from the whitelist", () => {
  assert.deepEqual(payvoucherWhere("2025-01-01", "2025-12-31", "cheque", "3131"), {
    whereClause: "WHERE cheque.PAYDATE BETWEEN ? AND ? AND cheque.CHEQUE LIKE ?",
    params: ["2025-01-01", "2025-12-31", "%3131%"],
  });
  assert.equal(payvoucherWhere("a", "b", "pnumber", "").whereClause, "WHERE cheque.PAYDATE BETWEEN ? AND ?");
  for (const bad of ["officer.CID", "__proto__", "toString", "constructor", null]) {
    assert.match(payvoucherWhere("a", "b", bad, "x").whereClause, /AND deegar\.PNUMBER LIKE \?$/, String(bad));
  }
  assert.deepEqual(Object.keys(PAYVOUCHER_FIELD_MAP).sort(), ["cheque", "name", "payname", "pnumber"]);
});

test("payvouchers export: staff only, same FROM/WHERE as the list, all rows, Thai-safe filename", () => {
  const exp = read("src/app/api/reports/payvouchers/export/route.ts");
  const list = read("src/app/api/reports/payvouchers/route.ts");
  const guard = exp.indexOf("if (!isStaff(session))");
  assert.ok(guard !== -1 && guard < exp.indexOf("prisma.$queryRawUnsafe("), "isStaff before query");
  for (const src of [exp, list]) {
    assert.match(src, /\$\{PAYVOUCHER_FROM\}/);
    assert.match(src, /payvoucherWhere\(start, end, fieldKey, term\)/);
  }
  assert.doesNotMatch(exp, /LIMIT \?/, "export must not be paged");
  assert.match(exp, /attachmentHeader\(filename, 'payvouchers-export'\)/);
  assert.doesNotMatch(exp, /detail:/, "no internal error text to the browser (PRD 8.8)");
});

test("KTB exports use the Thai-safe filename header", () => {
  for (const f of ["ktbcheque", "ktbdeegar"]) {
    const src = read(`src/app/api/reports/${f}/export/route.ts`);
    assert.match(src, new RegExp(`attachmentHeader\\(filename, '${f}-export'\\)`));
    assert.doesNotMatch(src, /`attachment; filename="\$\{filename\}"`/);
  }
});

test("payvouchers page: export button uses the last applied search; title renamed", () => {
  const page = read("src/app/(dashboard)/reports/payvouchers/page.tsx");
  assert.match(page, /ทะเบียนคุมหลักฐานการจ่าย<\/h1>/);
  assert.match(page, /\/api\/reports\/payvouchers\/export\?/);
  const href = page.slice(page.indexOf("const exportHref"), page.indexOf("const exportHref") + 400);
  assert.match(href, /appliedFilters\.startdate/);
  assert.doesNotMatch(href, /\bfilters\./, "must not use the editable form values");
});

test("creating a deegar returns plain numbers (no BigInt in JSON)", () => {
  const src = read("src/app/api/deegars/route.ts");
  assert.match(src, /return NextResponse\.json\(\{ item: serializeDeegarItem\(created\) \}\);/);
  assert.match(src, /ID: Number\(item\.ID\)/);
  assert.match(src, /PAY: toNumber\(item\.FEE\)/);
});

test("deegar search page has no NODEEGAR filter; summary typo fixed", () => {
  const page = read("src/app/(dashboard)/reports/deegars/page.tsx");
  // คอลัมน์ NODEEGAR ในตารางยังอยู่ — ตัดแค่ช่องค้นหา/ตัวกรอง
  assert.doesNotMatch(page, /filters\.nodeegar|id="nodeegar"|params\.set\("nodeegar"/);
  const api = read("src/app/api/salaries/deegars/route.ts");
  assert.doesNotMatch(api, /searchParams\.get\('nodeegar'\)/);
  const detail = read("src/app/(dashboard)/reports/summarydeegar/[pnumber]/[nodeegar]/page.tsx");
  assert.doesNotMatch(detail, /ทดลองราชการ/);
  assert.match(detail, /Total คืนเงินทดรองราชการ:/);
});

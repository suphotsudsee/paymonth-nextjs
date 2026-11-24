// ประวัติจ่ายตรงรายคนช้า: ค้น paydirect ด้วย CID ต้องมี index ที่ขึ้นต้นด้วย C (PRD 10.2, TASK_BOARD #14)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const sqlOnly = (s) => s.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");

test("SQL script only adds idx_paydirect_cid (C, A, B), re-runnable, no data changes", () => {
  const sql = sqlOnly(read("prisma/sql/2026-11-25_paydirect_cid_index.sql"));
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_paydirect_cid ON paydirect \(C, A, B\);/);
  assert.doesNotMatch(sql, /\b(UPDATE|DELETE|INSERT|DROP|TRUNCATE|ALTER TABLE)\b/i);
});

test("schema.prisma declares the same index so prisma db pull/push keeps it", () => {
  const schema = read("prisma/schema.prisma");
  const model = schema.slice(schema.indexOf("model paydirect {"));
  const body = model.slice(0, model.indexOf("\n}"));
  assert.match(body, /@@index\(\[C, A, B\], map: "idx_paydirect_cid"\)/);
});

test("per-person paydirect API filters by paydirect.C (the column the index starts with)", () => {
  const src = read("src/app/api/officers/[cid]/paydirect/route.ts");
  assert.match(src, /const whereClause = `paydirect\.C = \? AND/);
});

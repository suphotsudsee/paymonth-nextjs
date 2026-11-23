// การบันทึก login ลง useronline ต้องไม่เก็บรหัสผ่าน (PRD ข้อ 8.4, TASK_BOARD #3)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const WRITERS = ["src/app/api/auth/login/route.ts", "src/app/callback/route.ts"];

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

test("every useronline INSERT hard-codes NULL for password", () => {
  for (const f of WRITERS) {
    // จับทั้งคำสั่งจนถึงเครื่องหมายคำพูดปิดของ string SQL
    const inserts = read(f).match(/INSERT INTO useronline[^'"`]*/g) ?? [];
    assert.ok(inserts.length > 0, `${f}: no INSERT found`);
    for (const sql of inserts) {
      assert.match(sql, /\(username, password, logined, ipv4, logindate\)/, `${f}: column order changed`);
      assert.match(sql, /VALUES \(\?, NULL, \?, \?, NOW\(\)\)/, `${f}: ${sql}`);
    }
  }
});

test("login audit no longer carries the password at all", () => {
  for (const f of WRITERS) {
    const src = read(f);
    assert.doesNotMatch(src, /attempt\.password/, f);
    assert.doesNotMatch(src, /type LoginAttempt = \{[^}]*password/, f);
  }
});

test("no other code writes to useronline", () => {
  // ถ้ามีที่อื่นเขียน ต้องเพิ่มใน WRITERS เพื่อให้เทสต์ด้านบนครอบคลุม
  const writers = walk(join(ROOT, "src"))
    .filter((p) => /\.(ts|tsx)$/.test(p))
    .filter((p) => /(INSERT INTO|UPDATE)\s+useronline/i.test(readFileSync(p, "utf8")))
    .map((p) => relative(ROOT, p).split(sep).join("/"))
    .sort();
  assert.deepEqual(writers, [...WRITERS].sort());
});

test("login log API and page do not expose a password field", () => {
  assert.doesNotMatch(read("src/app/api/useronline/route.ts"), /\bpassword\b/);
  assert.doesNotMatch(read("src/app/(dashboard)/tools/useronline/page.tsx"), /password|รหัสผ่าน/i);
});

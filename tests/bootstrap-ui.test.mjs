// หน้าจอทั้งเว็บใช้ Bootstrap 5 (PRD ข้อ 11, TASK_BOARD #11)
// ตรวจจากซอร์ส: import CSS ครั้งเดียวใน root layout, ไม่มี CSS module ใหม่นอกจากที่อนุญาต, ไม่ใช้ JS ของ Bootstrap
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(join(root, p), "utf8");
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const srcFiles = walk(join(root, "src")).map((p) => relative(root, p).replaceAll("\\", "/"));

test("bootstrap is a dependency and its CSS is imported in the root layout before globals.css", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.dependencies.bootstrap ?? "", /^\^?5\./);
  const layout = read("src/app/layout.tsx");
  const bs = layout.indexOf('import "bootstrap/dist/css/bootstrap.min.css";');
  assert.ok(bs !== -1, "root layout must import bootstrap css");
  assert.ok(bs < layout.indexOf('import "./globals.css";'), "bootstrap must load before globals.css");
});

test("only the chart bars and the printable A4 slip keep a CSS module", () => {
  const modules = srcFiles.filter((p) => p.endsWith(".module.css")).sort();
  assert.deepEqual(modules, [
    "src/app/(dashboard)/charts/inout/page.module.css",
    "src/app/(dashboard)/officers/paydirect/[payid]/page.module.css",
  ]);
});

test("Bootstrap JS is not loaded (React state drives navbar/dropdown/modal)", () => {
  for (const p of srcFiles.filter((f) => /\.(tsx?|mjs)$/.test(f))) {
    assert.doesNotMatch(read(p), /bootstrap(\.bundle)?(\.min)?\.js|from ["']bootstrap["']|data-bs-toggle/, p);
  }
});

test("PasswordInput uses a Bootstrap input-group with the eye button", () => {
  const src = read("src/components/PasswordInput.tsx");
  assert.match(src, /<div className="input-group">/);
  assert.match(src, /className=\{\['form-control', className\]/);
  assert.match(src, /className="btn btn-outline-secondary/);
});

test("header hides the menu for status user exactly as before", () => {
  const header = read("src/components/layout/AppHeader.tsx");
  assert.match(header, /const items = userStatus === "user" \? \[\] : navItems;/);
  assert.match(header, /className="navbar navbar-expand-lg/);
});

test("money cells are right-aligned on every page (text-end)", () => {
  // ช่องตารางที่แสดงจำนวนเงิน (formatMoney/formatNumber/formatBaht/toLocaleString) ต้องชิดขวา — TASK_BOARD #13
  const money = /<(t[dh])((?:\s+[a-zA-Z]+=(?:"[^"]*"|\{[^}]*\}))*)\s*>\s*\{?(?:formatMoney|formatNumber|formatBaht|Number\([^)]*\)\.toLocaleString|[A-Za-z_.?]+\.toLocaleString)\(/g;
  let cells = 0;
  for (const p of srcFiles.filter((f) => f.startsWith("src/app/(dashboard)/") && f.endsWith("page.tsx"))) {
    for (const m of read(p).matchAll(money)) {
      cells++;
      assert.match(m[2], /className="[^"]*\btext-end\b/, `${p}: ${m[0].slice(0, 80)}`);
    }
  }
  assert.ok(cells >= 77, `expected the money cells, found ${cells}`);
});

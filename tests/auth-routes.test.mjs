// Regression: session ต้องออกได้เฉพาะหลังตรวจตัวตนจริง (password+captcha หรือ ThaiID ผ่าน /callback)
// ห้ามมี route ที่รับเลขบัตรจาก client แล้วออก session ตรงๆ (เคยมี /api/auth/thaiid-login — PRD ข้อ 8.1)
// รัน: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC_APP = join(ROOT, "src", "app");

// route ที่ได้รับอนุญาตให้เรียก signSession: login (password+captcha) และ callback (แลก code กับ DOPA ฝั่ง server)
const ALLOWED_SESSION_ISSUERS = new Set([
  ["api", "auth", "login", "route.ts"].join(sep),
  ["callback", "route.ts"].join(sep),
]);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

test("thaiid-login bypass route does not exist", () => {
  const routes = walk(SRC_APP).map((p) => relative(SRC_APP, p));
  assert.deepEqual(routes.filter((p) => p.includes("thaiid-login")), []);
});

test("only approved routes issue a session cookie", () => {
  const issuers = walk(SRC_APP)
    .filter((p) => /\.(ts|tsx)$/.test(p))
    .filter((p) => readFileSync(p, "utf8").includes("signSession("))
    .map((p) => relative(SRC_APP, p))
    .sort();
  assert.deepEqual(issuers, [...ALLOWED_SESSION_ISSUERS].sort());
});

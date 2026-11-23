// AUTH_SECRET ต้องตั้งเอง ไม่มี fallback และห้ามใช้ค่าที่หลุดแล้ว (PRD ข้อ 8.5, TASK_BOARD #4)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AuthSecretError, MIN_SECRET_BYTES, validateAuthSecret } from "../src/lib/authSecret.ts";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const LEAKED = "8f3a1e9c4b7d20568f3a1e9c4b7d20568f3a1e9c4b7d20568f3a1e9c4b7d2056";

test("missing or blank secret is rejected", () => {
  for (const v of [undefined, "", "   "]) {
    assert.throws(() => validateAuthSecret(v), AuthSecretError, String(v));
  }
});

test("the old hardcoded fallback is rejected even if set explicitly", () => {
  assert.throws(() => validateAuthSecret(LEAKED), /publicly known/);
  assert.throws(() => validateAuthSecret(` ${LEAKED} `), /publicly known/);
});

test("secrets shorter than 32 bytes are rejected", () => {
  assert.equal(MIN_SECRET_BYTES, 32);
  assert.throws(() => validateAuthSecret("a".repeat(31)), /too short \(31 bytes/);
  assert.equal(validateAuthSecret("a".repeat(32)).length, 32);
});

test("a random 32-byte hex secret is accepted and encoded as UTF-8 bytes", () => {
  const v = "0123456789abcdef".repeat(4);
  assert.deepEqual(validateAuthSecret(v), new TextEncoder().encode(v));
});

test("error message never echoes the secret value", () => {
  try {
    validateAuthSecret("short-secret-value");
    assert.fail("should throw");
  } catch (e) {
    assert.doesNotMatch(e.message, /short-secret-value/);
  }
});

test("auth.ts has no fallback and validates the key before any auth path", () => {
  for (const f of ["src/lib/auth.ts", "thaiid-login-package/src/lib/auth.ts"]) {
    const src = read(f);
    assert.doesNotMatch(src, /process\.env\.AUTH_SECRET\s*\|\|/, f);
    assert.doesNotMatch(src, new RegExp(LEAKED), f);
    // กุญแจต้องถูกอ่าน (และ validate) ก่อน if (token) — ไม่อย่างนั้นคำขอที่มีแค่ cookie NextAuth จะข้ามการตรวจ
    const body = src.slice(src.indexOf("export async function verifySession"));
    const keyAt = body.indexOf("const key = getAuthSecretKey();");
    assert.ok(keyAt !== -1, f);
    assert.ok(keyAt < body.indexOf("if (token)"), `${f}: key must be read before the token branch`);
    assert.ok(keyAt < body.indexOf("nextAuth()"), `${f}: key must be read before NextAuth`);
    assert.match(body, /jwtVerify\(token, key\)/, f);
  }
});

test("NextAuth config is lazy and validates AUTH_SECRET first", () => {
  for (const f of ["src/auth.ts", "thaiid-login-package/src/auth.ts"]) {
    const src = read(f);
    const lazy = src.slice(src.indexOf("NextAuth(() => {"));
    assert.ok(src.includes("NextAuth(() => {"), `${f}: NextAuth config must be a function`);
    const keyAt = lazy.indexOf("getAuthSecretKey();");
    assert.ok(keyAt !== -1 && keyAt < lazy.indexOf("return {"), `${f}: validate before building config`);
    assert.match(lazy, /return \{\s*secret: process\.env\.AUTH_SECRET,/, f);
  }
});

test("package copy of authSecret.ts matches the app", () => {
  assert.equal(read("thaiid-login-package/src/lib/authSecret.ts"), read("src/lib/authSecret.ts"));
});

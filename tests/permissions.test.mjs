// canAccessCid: ผู้ใช้ status "user" เข้าถึงได้เฉพาะ CID ตัวเอง (PRD ข้อ 8.2)
// Node 24 รัน .ts ได้โดยตัด type ทิ้ง (permissions.ts ไม่มี import จึง import ตรงได้)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessCid, hasAdminAccess, isStaff, roleOf } from "../src/lib/permissions.ts";

const OWN = "1111111111111";
const OTHER = "2222222222222";

test("limited user: only own CID", () => {
  const s = { status: "user", cid: OWN, accessLevel: 0 };
  assert.equal(canAccessCid(s, OWN), true);
  assert.equal(canAccessCid(s, OTHER), false);
  assert.equal(canAccessCid(s, ` ${OWN} `), true); // ช่องว่างรอบ CID ไม่ทำให้ถูกปฏิเสธ
});

// ข้อมูลจริง: status "user" มี accessLevel 1 ถึง 12,128 จาก 12,140 บัญชี — accessLevel ต้องไม่ให้สิทธิ์ใดๆ
const LEVELS = [undefined, null, 0, "0", 1, "1", 2, 8, 9, 99, "abc", -1];

test("ordinary users and unknown statuses are limited at every accessLevel (fail closed)", () => {
  for (const status of [undefined, null, "", "  ", "USER", " User ", "user", "๊user", "นางสาว", "finance", "guest",
    // ห้ามจับแบบ substring: ค่าเหล่านี้มีคำว่า admin/manager/editor แต่ไม่ใช่บทบาทนั้น
    "not-admin", "former-manager", "non-editor", "Super Admin", "admin2", "administrator", "editor-trainee"]) {
    for (const accessLevel of LEVELS) {
      const s = { status, cid: OWN, accessLevel };
      const tag = JSON.stringify(s);
      assert.equal(roleOf(s), "USER", tag);
      assert.equal(isStaff(s), false, tag);
      assert.equal(hasAdminAccess(s), false, tag);
      assert.equal(canAccessCid(s, OTHER), false, tag);
      assert.equal(canAccessCid(s, OWN), true, tag);
    }
  }
});

test("admin/manager are ADMIN, editor is EDITOR, whatever the accessLevel", () => {
  for (const accessLevel of LEVELS) {
    for (const status of ["admin", "Admin", " ADMIN ", " manager ", "Manager"]) {
      const s = { status, accessLevel };
      assert.equal(roleOf(s), "ADMIN", JSON.stringify(s));
      assert.equal(hasAdminAccess(s), true, JSON.stringify(s));
      assert.equal(isStaff(s), true, JSON.stringify(s));
    }
    const e = { status: " Editor ", accessLevel };
    assert.equal(roleOf(e), "EDITOR");
    assert.equal(isStaff(e), true);
    assert.equal(hasAdminAccess(e), false, "editor must not manage users");
  }
  assert.equal(hasAdminAccess(null), false);
  assert.equal(isStaff(undefined), false);
});

test("no role check anywhere grants access from accessLevel", () => {
  // ห้ามกลับไปใช้ accessLevel ตัดสินสิทธิ์ (เคยเป็นช่องโหว่: ผู้ใช้ทั่วไป accessLevel 1 ผ่านเป็นเจ้าหน้าที่)
  for (const rel of [
    "src/lib/permissions.ts",
    "src/lib/session.ts",
    "src/middleware.ts",
    "src/app/api/banks/route.ts",
    "src/app/api/banks/[id]/route.ts",
  ]) {
    // ตัดคอมเมนต์ออกก่อน (คอมเมนต์อธิบายเหตุผลมีข้อความ "accessLevel >= 1")
    const src = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(src, /(level|accessLevel)\s*>=?\s*\d/i, rel);
  }
  const mw = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
  assert.match(mw, /roleOf\(session\) === 'USER'/);
  const sess = readFileSync(new URL("../src/lib/session.ts", import.meta.url), "utf8");
  assert.match(sess, /const deriveRole = \(session: SessionPayload\): AppRole => roleOf\(session\);/);
});

test("limited user without a CID in session gets nothing", () => {
  assert.equal(canAccessCid({ status: "user", cid: "" }, OTHER), false);
  assert.equal(canAccessCid({ status: "user" }, ""), false);
});

test("staff roles keep access to any CID", () => {
  for (const s of [
    { status: "admin", cid: OWN },
    { status: "manager", cid: OWN },
    { status: "editor", cid: OWN },
  ]) {
    assert.equal(canAccessCid(s, OTHER), true, JSON.stringify(s));
  }
});

test("no session or empty target CID is denied", () => {
  assert.equal(canAccessCid(null, OWN), false);
  assert.equal(canAccessCid(undefined, OWN), false);
  assert.equal(canAccessCid({ status: "admin" }, "  "), false);
});

// route ที่รับ CID จาก URL/query และคืนข้อมูลรายคน ต้องเรียก canAccessCid
const GUARDED_ROUTES = [
  "src/app/api/officers/[cid]/route.ts",
  "src/app/api/officers/[cid]/personal/route.ts",
  "src/app/api/officers/[cid]/payperson/[yearthai]/[monththai]/route.ts",
  "src/app/api/salaryuser/report/route.ts",
  "src/app/api/banks/route.ts",
];

test("per-officer routes check CID ownership", () => {
  for (const rel of GUARDED_ROUTES) {
    const src = readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
    assert.match(src, /canAccessCid\(session, cid\)/, rel);
    assert.doesNotMatch(src, /const session = verifySession\(/, `${rel}: verifySession must be awaited`);
  }
});

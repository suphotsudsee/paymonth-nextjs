// canAccessCid: ผู้ใช้ status "user" เข้าถึงได้เฉพาะ CID ตัวเอง (PRD ข้อ 8.2)
// Node 24 รัน .ts ได้โดยตัด type ทิ้ง (permissions.ts ไม่มี import จึง import ตรงได้)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canAccessCid } from "../src/lib/permissions.ts";

const OWN = "1111111111111";
const OTHER = "2222222222222";

test("limited user: only own CID", () => {
  const s = { status: "user", cid: OWN, accessLevel: 0 };
  assert.equal(canAccessCid(s, OWN), true);
  assert.equal(canAccessCid(s, OTHER), false);
  assert.equal(canAccessCid(s, ` ${OWN} `), true); // ช่องว่างรอบ CID ไม่ทำให้ถูกปฏิเสธ
});

test("missing, blank, unknown or 'user' status with accessLevel 0 is limited (fail closed)", () => {
  for (const status of [undefined, null, "", "  ", "USER", " User ", "user", "finance", "guest"]) {
    for (const accessLevel of [undefined, 0, "0", "abc", -1]) {
      const s = { status, cid: OWN, accessLevel };
      assert.equal(canAccessCid(s, OTHER), false, JSON.stringify(s));
      assert.equal(canAccessCid(s, OWN), true, JSON.stringify(s));
    }
  }
});

test("limited user without a CID in session gets nothing", () => {
  assert.equal(canAccessCid({ status: "user", cid: "" }, OTHER), false);
  assert.equal(canAccessCid({ status: "user" }, ""), false);
});

test("staff roles keep access to any CID (unchanged behaviour)", () => {
  for (const s of [
    { status: "admin", cid: OWN },
    { status: "manager", cid: OWN },
    { status: "editor", cid: OWN },
    { status: "Super Admin", cid: OWN },
    { status: "", cid: OWN, accessLevel: 1 },
    { status: "user", cid: OWN, accessLevel: 2 },
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

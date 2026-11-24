// ช่องรหัสผ่านแบบมีปุ่มตา: เริ่มแบบซ่อน และซ่อนกลับทุกครั้งที่ส่งฟอร์ม (Codex review)
// ยังไม่มี DOM สำหรับเทสต์ (ไม่มี jsdom) จึงตรวจ render ฝั่ง server + ตรวจการผูก event จากซอร์ส
// พฤติกรรมจริงตรวจในเบราว์เซอร์ บันทึกไว้ใน docs/TASK_BOARD.md งาน #9
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const src = read("src/components/PasswordInput.tsx");

test("starts hidden: type is password until the eye is clicked", () => {
  assert.match(src, /const \[visible, setVisible\] = useState\(false\);/);
  assert.match(src, /type=\{visible \? 'text' : 'password'\}/);
});

test("eye button never submits the form", () => {
  assert.match(src, /<button\s+type="button"/);
});

test("form submit and reset hide the password again", () => {
  const effect = src.slice(src.indexOf("const form = inputRef.current?.form;"));
  assert.ok(src.includes("ref={inputRef}"), "input must be wired to the ref");
  assert.match(effect, /const conceal = \(\) => setVisible\(false\);/);
  assert.match(effect, /addEventListener\('submit', conceal\)/);
  assert.match(effect, /addEventListener\('reset', conceal\)/);
  assert.match(effect, /removeEventListener\('submit', conceal\)/);
  assert.match(effect, /removeEventListener\('reset', conceal\)/);
});

test("concealKey change hides the password", () => {
  assert.match(src, /useEffect\(\(\) => \{\s*setVisible\(false\);\s*\}, \[concealKey\]\);/);
});

test("login form uses PasswordInput inside a <form> (submit listener applies)", () => {
  const login = read("src/app/(auth)/login/page.tsx");
  assert.ok(login.indexOf("<form onSubmit") !== -1 && login.indexOf("<form onSubmit") < login.indexOf("<PasswordInput"));
  assert.doesNotMatch(login, /type="password"/);
});

test("user form (no <form>) bumps concealKey on every save attempt", () => {
  const users = read("src/app/(dashboard)/tools/users/page.tsx");
  assert.match(users, /concealKey=\{submitCount\}/);
  const save = users.slice(users.indexOf("const submitForm = async () => {"));
  const bump = save.indexOf("setSubmitCount((n) => n + 1)");
  assert.ok(bump !== -1 && bump < save.indexOf("await fetch"), "must hide before the request, so failures hide too");
  assert.doesNotMatch(users, /type="password"/);
});

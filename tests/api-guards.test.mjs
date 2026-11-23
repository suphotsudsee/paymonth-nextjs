// ทุก API route ต้องตรวจบทบาท/เจ้าของข้อมูล ไม่ใช่แค่ "login แล้ว" (PRD ข้อ 8.3, TASK_BOARD #2b)
// route ใหม่ที่ไม่มี guard จะทำให้เทสต์นี้ล้ม — ถ้าตั้งใจให้เปิด ต้องเพิ่มใน PUBLIC พร้อมเหตุผล
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const API = fileURLToPath(new URL("../src/app/api", import.meta.url));
const rel = (p) => relative(API, p).split(sep).join("/");

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const routes = walk(API).filter((p) => p.endsWith("route.ts"));

// route ที่ต้องเปิดก่อน login หรือใช้ได้กับทุกคนที่ login (แค่ข้อมูลตัวเอง)
const PUBLIC = new Map([
  ["auth/captcha/route.ts", "หน้า login ต้องขอ captcha ก่อน login"],
  ["auth/login/route.ts", "login ด้วยรหัสผ่าน"],
  ["auth/logout/route.ts", "ลบ cookie ของตัวเอง"],
  ["auth/me/route.ts", "คืน session ของตัวเอง"],
  ["auth/[...nextauth]/route.ts", "NextAuth handler"],
  ["officers/[cid]/payperson/route.ts", "re-export GET จาก personal/route.ts (มี canAccessCid)"],
  ["thaiid/exchange/route.ts", "แลก code กับ DOPA ไม่ออก session — รอยืนยันว่ายังใช้อยู่ (PRD ข้อ 9)"],
]);

const GUARD = /\b(isStaff|hasAdminAccess|canAccessCid|canManageBanks)\(session|build(Paydirect|Officer)AccessClause\(session/;
const DB = /\bprisma\./;
// method ทั้งหมดที่ Next.js route handler รองรับ
const METHOD = "(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)";
const ASYNC_HANDLER = new RegExp(`export async function ${METHOD}\\b`, "g");

// แยกตาม handler ที่ export (ทุก method ใน METHOD) — guard ต้องมีในทุก handler และอยู่ก่อน prisma ครั้งแรก
// คืนรายชื่อ handler ที่ไม่ผ่าน
export function unguardedHandlers(src) {
  const starts = [...src.matchAll(ASYNC_HANDLER)];
  return starts.flatMap((m, i) => {
    const body = src.slice(m.index, starts[i + 1]?.index ?? src.length);
    const g = body.search(GUARD);
    const d = body.search(DB);
    return g === -1 || (d !== -1 && d < g) ? [m[1]] : [];
  });
}

// handler ที่ export แบบอื่น (export const GET = ..., export { x as GET }, export { GET } from "...")
// checker ตรวจเนื้อหาไม่ได้ จึงห้ามใช้ใน route ที่ไม่อยู่ใน PUBLIC — ต้องเขียนเป็น export async function เท่านั้น
export function otherHandlerExports(src) {
  const forms = [
    new RegExp(`export\\s+(const|let|var)\\s+${METHOD}\\b`, "g"),
    new RegExp(`export\\s+function\\s+${METHOD}\\b`, "g"), // ไม่ async ก็ไม่ใช่รูปแบบที่ checker รับ
    new RegExp(`export\\s*\\{[^}]*\\b${METHOD}\\b[^}]*\\}`, "g"),
  ];
  return forms.flatMap((re) => [...src.matchAll(re)].map((m) => m[0].replace(/\s+/g, " ")));
}

test("checker rejects handler exports it cannot inspect", () => {
  const src = `
export async function GET() { if (!isStaff(session)) return; }
export const POST = async () => {};
export { remove as DELETE };
export { PUT } from "./other";
export function PATCH() {}`;
  assert.equal(otherHandlerExports(src).length, 4);
  assert.deepEqual(otherHandlerExports("export async function GET() {}\nexport const dynamic = 'force-dynamic';"), []);
});

test("non-public routes only declare handlers as export async function", () => {
  const bad = routes
    .map(rel)
    .filter((r) => !PUBLIC.has(r))
    .flatMap((r) => otherHandlerExports(readFileSync(join(API, r), "utf8")).map((e) => `${r}: ${e}`));
  assert.deepEqual(bad, []);
});

test("checker flags an unguarded handler next to a guarded one", () => {
  const mixed = `
export async function GET(req) { const session = await verifySession(); if (!isStaff(session)) return; await prisma.x.findMany(); }
export async function POST(req) { const session = await verifySession(); await prisma.x.create(); }
export async function PUT(req) { const session = await verifySession(); await prisma.x.findUnique(); if (!isStaff(session)) return; }
export async function HEAD(req) { await prisma.x.count(); }
export async function OPTIONS(req) { return new Response(null); }`;
  assert.deepEqual(unguardedHandlers(mixed), ["POST", "PUT", "HEAD", "OPTIONS"]);
});

test("every handler of every non-public API route checks role or ownership before DB access", () => {
  const missing = routes
    .map(rel)
    .filter((r) => !PUBLIC.has(r))
    .flatMap((r) => {
      const src = readFileSync(join(API, r), "utf8");
      const handlers = src.match(ASYNC_HANDLER) ?? [];
      if (handlers.length === 0) return [`${r}: no exported handler`];
      return unguardedHandlers(src).map((h) => `${r} ${h}`);
    });
  assert.deepEqual(missing, []);
});

test("PUBLIC list has no stale entries", () => {
  const all = new Set(routes.map(rel));
  assert.deepEqual([...PUBLIC.keys()].filter((r) => !all.has(r)), []);
});

test("verifySession is always awaited", () => {
  const bad = routes.map(rel).filter((r) => /=\s*verifySession\(/.test(readFileSync(join(API, r), "utf8")));
  assert.deepEqual(bad, []);
});

test("user management and login log are admin-only", () => {
  for (const r of ["users/route.ts", "users/[id]/route.ts", "useronline/route.ts"]) {
    const src = readFileSync(join(API, r), "utf8");
    const handlers = (src.match(ASYNC_HANDLER) ?? []).length;
    const guards = (src.match(/hasAdminAccess\(session\)/g) ?? []).length;
    assert.ok(handlers > 0 && guards >= handlers, `${r}: ${guards} admin guard(s) for ${handlers} handler(s)`);
    assert.doesNotMatch(src, /isStaff\(session\)/, r);
  }
});

test("password column is never selected back to the browser", () => {
  for (const r of ["users/route.ts", "users/[id]/route.ts", "useronline/route.ts"]) {
    const src = readFileSync(join(API, r), "utf8");
    for (const sel of src.match(/SELECT[\s\S]*?FROM/g) ?? []) {
      assert.doesNotMatch(sel, /\bpassword\b/i, `${r}: ${sel.replace(/\s+/g, " ")}`);
    }
  }
  // ผลลัพธ์ prisma ที่ถูกส่งกลับเป็น JSON ({ user: created } / { user: updated }) ต้อง omit password
  const returned = [
    ["users/route.ts", /const created = await prisma\.user\.create\(\{[\s\S]*?\n\s{4}\}\);/],
    ["users/[id]/route.ts", /const updated = await prisma\.user\.findUnique\([^;]*\);/],
  ];
  for (const [r, re] of returned) {
    const call = readFileSync(join(API, r), "utf8").match(re)?.[0];
    assert.ok(call, `${r}: returned prisma call not found`);
    assert.match(call, /omit:\s*\{\s*password:\s*true\s*\}/, r);
  }
});

# Task Board

| # | งาน | สถานะ | หลักฐาน (test output / Codex review) |
|---|-----|-------|--------------------------------------|
| 0 | ติดตั้ง pstack (CLAUDE.md, Stop hook, scripts) + เขียน PRD.md จากโค้ดเดิม | เสร็จ | ไม่มีการแก้โค้ดแอป; `python scripts/cross_review.py` หลัง commit |
| 1 | [วิกฤต] ปิด/แก้ `POST /api/auth/thaiid-login` ที่ออก session จาก `pid` ใน body โดยไม่ตรวจ (PRD ข้อ 8.1) | เสร็จ | ดู "หลักฐาน: งาน #1" ด้านล่าง |
| 2 | [สูง] ตรวจสิทธิ์เจ้าของข้อมูลใน API payperson และ route รายคนที่ใช้แค่ `verifySession` (PRD 8.2) | เสร็จ | ดู "หลักฐาน: งาน #2" ด้านล่าง |
| 2b | [สูง] route ฝั่งงานคลัง (นำเข้า paydirect, เช็ค, ฎีกา, หน่วยงาน, รายงาน, export KTB, users) ยังไม่ตรวจบทบาท — USER เรียกได้ (PRD 8.3); `/api/users` GET คืนคอลัมน์ password ด้วย | เสร็จ | ดู "หลักฐาน: งาน #2b" ด้านล่าง |
| 2c | [กลาง] จำกัด EDITOR ตามหน่วยงาน และให้ middleware ใช้เกณฑ์เดียวกับ `canAccessCid` (status ว่าง = สิทธิ์จำกัด) | รอ | |
| 3 | [สูง] เลิกบันทึกรหัสผ่านลง `useronline` (PRD 8.4) | เสร็จ (โค้ด) — **รอคนรัน SQL ล้างแถวเก่าบน DB จริง** | ดู "หลักฐาน: งาน #3" ด้านล่าง |
| 4 | [สูง] บังคับตั้ง `AUTH_SECRET` (ไม่มี fallback) (PRD 8.5) | รอ | |
| 5 | [กลาง] export KTB ใช้ `salary.BANKID` แทน JOIN ตาม CID (PRD 8.7) | รอ | |
| 6 | ตั้งระบบเทสต์ของแอป (ยังไม่มีเลย) ก่อนเริ่มงาน 1–5 | รอ | |

## หลักฐาน: งาน #1 — ลบ route ThaiID login ที่ข้ามการตรวจตัวตน

### สิ่งที่เปลี่ยน
- ลบ `src/app/api/auth/thaiid-login/route.ts` — รับ `pid` จาก body แล้ว `signSession` ทันทีโดยไม่ตรวจกับ DOPA
  (ใครรู้เลขบัตร admin ก็ได้ session admin) ค้นทั้ง repo แล้วไม่มีโค้ดเรียก route นี้; ThaiID จริงใช้ `/callback`
  ซึ่งแลก code กับ DOPA ฝั่ง server ก่อนออก session
- ลบ route เดียวกันใน `thaiid-login-package/` (ชุดไฟล์สำหรับก๊อปไปโปรเจกต์อื่น) และตัดออกจาก README ของ package
  ไม่อย่างนั้นโปรเจกต์ที่ก๊อปไปจะได้ช่องโหว่เดียวกัน
- เพิ่ม `tests/auth-routes.test.mjs` + `npm test`: กันไม่ให้ route นี้กลับมา และบังคับว่าไฟล์ใน `src/app`
  ที่เรียก `signSession(` มีได้แค่ `api/auth/login/route.ts` และ `callback/route.ts`

### เทสต์ — `npm test` (output จริง)
```
✔ thaiid-login bypass route does not exist
✔ only approved routes issue a session cookie
ℹ pass 2
ℹ fail 0
```
เทสต์จับช่องโหว่ได้จริง: คืนไฟล์เดิมชั่วคราว (`git stash`) แล้วรัน -> `✖` ทั้ง 2 ตัว (`ℹ pass 0, ℹ fail 2`)

### เรียกจริงบน dev server (`npm run dev`, port 9102) หลังลบ
```
POST /api/auth/thaiid-login {"pid":"0000000000000"} -> 400 "Bad request."   (ตอบโดย catch-all ของ NextAuth /api/auth/[...nextauth])
Set-Cookie: session ใน response -> 0 บรรทัด
control GET /api/auth/captcha -> 200
```

### Build
`npm run build` -> BUILD_EXIT=0, `npx tsc --noEmit` -> TSC_EXIT=0
(ก่อน build, tsc error จาก `.next/types/validator.ts` ที่ยังอ้าง route เก่า — เป็น type ที่ generate ค้างไว้ หายหลัง build)

### ผลข้างเคียง
- `.claude/launch.json` เพิ่มเพื่อเปิด dev server ใน Claude Desktop (`npm run dev`, port 9102 ตาม package.json)

## หลักฐาน: งาน #2 — ตรวจเจ้าของ CID ใน API ข้อมูลรายคน

### สิ่งที่เปลี่ยน
- `src/lib/permissions.ts`: เพิ่ม `isStaff` / `canAccessCid` แบบ fail closed — ดู CID อื่นได้เฉพาะ status ที่มี
  admin / manager / editor หรือ `accessLevel >= 1` (เกณฑ์เดียวกับ `deriveRole` ใน `src/lib/session.ts`);
  status ว่าง / ไม่รู้จัก / `user` + accessLevel 0 เห็นได้เฉพาะ CID ตัวเอง
  **ผลกระทบ**: บัญชีเจ้าหน้าที่ที่ status เป็นค่าอื่น (เช่น ว่าง) และ accessLevel 0 จะได้ 403 เมื่อเปิดข้อมูลคนอื่น
  — ต้องตรวจตาราง `user` ก่อน deploy
- ใส่ guard (403) ก่อน query ใน: `officers/[cid]` GET + PUT, `officers/[cid]/personal`,
  `officers/[cid]/payperson/[yearthai]/[monththai]` (สลิป), `salaryuser/report`, `banks` GET
- `salaryuser/report`: เดิมเรียก `verifySession(...)` โดยไม่ `await` → ได้ Promise ซึ่ง truthy เสมอ = **ไม่ต้อง login ก็ดึงข้อมูลได้** แก้เป็น `await`
- ไม่แตะ route ที่ตรวจเจ้าของอยู่แล้ว: `officers/[cid]/salaries`, `salaries`, `salaries/[id]`, `officers/[cid]/paydirect`, `paydirect/report`, `banks` POST/PUT/DELETE

### เทสต์ — `npm test` (output จริง)
```
✔ thaiid-login bypass route does not exist
✔ only approved routes issue a session cookie
✔ limited user: only own CID
✔ missing, blank, unknown or 'user' status with accessLevel 0 is limited (fail closed)
✔ limited user without a CID in session gets nothing
✔ staff roles keep access to any CID (unchanged behaviour)
✔ no session or empty target CID is denied
✔ per-officer routes check CID ownership
ℹ pass 8
ℹ fail 0
```
`npx tsc --noEmit` -> 0 (Node แสดง warning `MODULE_TYPELESS_PACKAGE_JSON` ตอน import `.ts` ในเทสต์ — ไม่กระทบผล)

### เรียกจริงบน dev server — session JWT ที่เซ็นด้วย AUTH_SECRET ของเครื่อง, CID สมมติ 1111111111111 (ตัวเอง) / 2222222222222 (คนอื่น)
DB ในเครื่องนี้ login ไม่ได้ (`Authentication failed ... for root`) ดังนั้นคำขอที่ **ผ่าน** guard จะจบที่ 500 ตอน query;
403 แปลว่าถูกตัดก่อนแตะ DB ซึ่งคือสิ่งที่ต้องการพิสูจน์

| คำขอ | ก่อนแก้ | หลังแก้ |
|------|--------|--------|
| USER → CID คนอื่น (5 GET + PUT `officers/[cid]`) | 500 (ผ่านไปถึง DB) | **403** ทุกตัว |
| USER → CID ตัวเอง (5 GET) | 500 | 500 (ผ่าน guard ถึง DB) |
| ADMIN → CID คนอื่น (5 GET) | 500 | 500 (ผ่าน guard ถึง DB) |
| ไม่มี session → `salaryuser/report` | 500 (ผ่านไปถึง DB = ไม่ตรวจ login) | **401** |
| status ว่าง + accessLevel 0 → CID คนอื่น (5 GET) | 500 (ผ่านไปถึง DB) | **403** ทุกตัว (หลังแก้ตาม Codex รอบ 1) |

ยังพิสูจน์ไม่ได้ในเครื่องนี้: กรณีที่ผ่าน guard ได้ข้อมูลถูกต้อง (ต้องมี DB) — logic ส่วนนั้นไม่ได้แก้

### Codex รอบ 1 (EXIT=1) — แก้แล้ว
- `permissions.ts` fail open: status ว่าง/ไม่รู้จัก ได้สิทธิ์ทุก CID -> เปลี่ยนเป็น allowlist บทบาทเจ้าหน้าที่ (ตาม `deriveRole`)
  + เทสต์ status missing/blank/unknown × accessLevel ไม่ถึง 1 (45 กรณี)

## หลักฐาน: งาน #2b — ตรวจบทบาทใน API ฝั่งงานคลัง + ไม่ส่ง hash รหัสผ่าน

### สิ่งที่เปลี่ยน
- **เจ้าหน้าที่เท่านั้น** (`isStaff`: status มี admin/manager/editor หรือ accessLevel >= 1) ใส่ 403 ต่อจากการตรวจ login ใน 31 route:
  charts/inout, cheques (+[cheque]), cmonths, cpays (+[idpay]), deegars (+[pnumber]/[nodeegar]), officers (list/create),
  paydirect/import, regisdeegar, regisdeegars (+[pnumber]), reports/* ทั้ง 12 ตัว (รวม export KTB), salaries/cheques,
  salaries/deegars, stations (+[code], departs)
- **admin เท่านั้น** (`hasAdminAccess`: admin/manager หรือ accessLevel >= 1 — editor ไม่ได้): users, users/[id], useronline
  เดิม **ผู้ใช้ที่ login แล้วทุกคนแก้ `/api/users/[id]` ได้ รวมถึงตั้ง accessLevel ของตัวเอง = ยกตัวเองเป็น admin ได้**
- `salaries` POST, `salaries/[id]` PUT/DELETE: เจ้าหน้าที่เท่านั้น ตรวจก่อน validate body (เดิมผู้ใช้ status `user`
  สร้าง/แก้/ลบเงินเดือนของตัวเองได้; หน้าเว็บของ USER ไม่ได้เรียก route เหล่านี้ — middleware กันหน้า `/salaries` อยู่แล้ว)
- `officers/[cid]/salaries` GET: เปลี่ยนเป็น `canAccessCid` (fail closed เหมือน #2)
- `regisdeegar`: `verifySession` ไม่ได้ `await` (เหมือน salaryuser/report ใน #2) = ไม่ตรวจ login เลย แก้แล้ว — เจอจาก tsc หลังใส่ guard
- ไม่ส่ง hash รหัสผ่านกลับ browser: ตัด `password` ออกจาก SELECT ของ users, users/[id], useronline
  (useronline เก็บรหัสผ่านที่พิมพ์ตอน login เป็นข้อความธรรมดา — งาน #3 ยังต้องเลิกเก็บ) และ `omit: { password: true }`
  ในผลของ create/update; หน้า `/tools/users` เอาคอลัมน์และช่อง Password ออก
- route ที่ยังเปิด (มีเหตุผลใน `tests/api-guards.test.mjs` → `PUBLIC`): auth/*, officers/[cid]/payperson (re-export ที่มี guard),
  thaiid/exchange (ไม่ออก session; รอยืนยันว่ายังใช้)

### เทสต์ — `npm test` (output จริง)
```
✔ checker rejects handler exports it cannot inspect
✔ non-public routes only declare handlers as export async function
✔ checker flags an unguarded handler next to a guarded one
✔ every handler of every non-public API route checks role or ownership before DB access
✔ PUBLIC list has no stale entries
✔ verifySession is always awaited
✔ user management and login log are admin-only
✔ password column is never selected back to the browser
✔ thaiid-login bypass route does not exist
✔ only approved routes issue a session cookie
✔ limited user: only own CID
✔ missing, blank, unknown or 'user' status with accessLevel 0 is limited (fail closed)
✔ limited user without a CID in session gets nothing
✔ staff roles keep access to any CID (unchanged behaviour)
✔ no session or empty target CID is denied
✔ per-officer routes check CID ownership
ℹ pass 16
ℹ fail 0
```
`tests/api-guards.test.mjs` จับได้จริง: รันกับโค้ดก่อนแก้ (`git stash push -- src`) -> `✖` 4 ตัวที่ตรวจโค้ด
(guard ทุก handler, await verifySession, admin-only, password) ส่วนที่ผ่านคือเทสต์ของตัว checker เองและ PUBLIC list; `npx tsc --noEmit` -> 0; `npm run build` -> 0

### เรียกจริงบน dev server (JWT เซ็นด้วย AUTH_SECRET ของเครื่อง; DB ในเครื่อง login ไม่ได้ -> ผ่าน guard แล้วจบที่ 500/400)

| คำขอ | user | status ว่าง | editor | admin | ก่อนแก้ (user) |
|------|-----|------------|--------|-------|---------------|
| GET cheques / reports/taxdept / stations / regisdeegar / export KTB | 403 | 403 | 500 | 500 | 500 (ผ่านถึง DB) |
| GET deegars | 403 | 403 | 500 | 500 | 403 (แต่ status ว่าง = 500) |
| POST deegars / paydirect/import | 403 | 403 | 400/500 | 400/500 | 400/500 (ผ่าน) |
| POST salaries / DELETE salaries/1 | 403 | 403 | 400/500 | 400/500 | 400/500 (ผ่าน) |
| GET users / PUT users/1 `{"accessLevel":9}` / GET useronline | 403 | 403 | **403** | 500 | 500 (ผ่านถึง DB) |
| GET auth/me (ต้องยังใช้ได้) | 200 | 200 | 200 | 200 | 200 |
| GET officers/<ตัวเอง>/personal (หน้า USER ต้องยังใช้ได้) | 500 | 500 | 500 | 500 | 500 |

ยังพิสูจน์ไม่ได้ในเครื่องนี้: หน้าเว็บ `/tools/users` หลังเอาคอลัมน์ Password ออก (ต้อง login ซึ่งต้องมี DB) — ผ่าน tsc และ build

### Codex รอบ 1 (EXIT=1) — แก้แล้ว
- เทสต์ตรวจ guard ทีละไฟล์ GET ที่มี guard จะบัง POST ที่ไม่มี -> ตรวจทีละ handler ที่ export และ guard ต้องอยู่ก่อน `prisma.`
  ครั้งแรกใน handler + เทสต์ของ checker เอง (GET มี guard, POST ไม่มี, PUT guard หลัง DB -> ต้องจับได้ POST และ PUT)
  ผลกับโค้ดจริง: ทุก handler ผ่าน (ไม่พบ handler ที่หลุด) — การตอบ 401/403 ก่อนแตะ DB ยืนยันด้วยตารางเรียกจริงด้านบน

### Codex รอบ 2 (EXIT=1) — แก้แล้ว
- checker มองไม่เห็น handler ที่ export แบบ `export const POST = ...` / `export { x as POST }` -> ห้ามรูปแบบเหล่านี้ใน route
  ที่ไม่อยู่ใน PUBLIC (ต้องเป็น `export async function` ซึ่ง checker ตรวจเนื้อหาได้) + เทสต์ของ checker 4 รูปแบบ
  ผลกับโค้ดจริง: ไม่มี route ไหนใช้รูปแบบอื่น

### Codex รอบ 3 (EXIT=1) — แก้แล้ว
- `HEAD` / `OPTIONS` ไม่ถูกตรวจ -> ใช้รายการ method เดียวกัน (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) ทั้งใน checker
  และการนับ handler + เทสต์ของ checker ให้ HEAD/OPTIONS ที่ไม่มี guard ต้องถูกจับ; โค้ดจริงไม่มี HEAD/OPTIONS

### Attack the Premise
ข้อขอ 3 รอบล่าสุดเป็นเรื่องความครอบคลุมของ **เทสต์แบบอ่านโค้ด** (static) ทั้งหมด ไม่ใช่ช่องโหว่ในโค้ดแอป
ขอบเขตที่ตั้งไว้: เทสต์นี้กันการลืมใส่ guard ในรูปแบบที่โปรเจกต์ใช้จริง (`export async function` + `verifySession`)
ไม่ได้พิสูจน์การตรวจสิทธิ์แบบสมบูรณ์ — การพิสูจน์จริงคือเรียก route ด้วย session แต่ละบทบาท (ตารางด้านบน)
ถ้า Codex ขอเพิ่มเรื่อง static checker อีก จะหยุดและบันทึกเหตุผลแทนการแก้วนต่อ

## หลักฐาน: งาน #3 — เลิกเก็บรหัสผ่านในบันทึกการ login

### สิ่งที่เปลี่ยน
- `api/auth/login`: เดิมบันทึกรหัสผ่านที่ผู้ใช้พิมพ์ (ข้อความธรรมดา, ทุกครั้งรวมครั้งที่ผิด) ลง `useronline.password`
  -> INSERT ใส่ `NULL` ตายตัวใน SQL และตัด `password` ออกจาก `LoginAttempt` (ไม่มีทางส่งรหัสเข้าไปได้)
- `callback` (ThaiID): เดิมส่ง `null` อยู่แล้ว เปลี่ยนเป็น `NULL` ใน SQL ให้เหมือนกัน
- หน้า `/tools/useronline`: เอาคอลัมน์ "รหัสผ่านที่ใช้" ออก (เดิมแสดง 4 ตัวแรก + รหัสเต็มใน tooltip);
  API `useronline` เลิก SELECT password ตั้งแต่งาน #2b
- `prisma/sql/2026-11-23_clear_useronline_passwords.sql`: ล้างรหัสในแถวเก่า — **ยังไม่ได้รัน** (DB ในเครื่องเข้าไม่ได้
  และเป็นการแก้ข้อมูลจริงที่ย้อนไม่ได้ ต้องให้เจ้าของระบบรันเอง; backup เก่าก็มีรหัสอยู่ด้วย)

### เทสต์ — `npm test` (output จริง)
```
✔ checker rejects handler exports it cannot inspect
✔ non-public routes only declare handlers as export async function
✔ checker flags an unguarded handler next to a guarded one
✔ every handler of every non-public API route checks role or ownership before DB access
✔ PUBLIC list has no stale entries
✔ verifySession is always awaited
✔ user management and login log are admin-only
✔ password column is never selected back to the browser
✔ thaiid-login bypass route does not exist
✔ only approved routes issue a session cookie
✔ every useronline INSERT hard-codes NULL for password
✔ login audit no longer carries the password at all
✔ no other code writes to useronline
✔ login log API and page do not expose a password field
✔ limited user: only own CID
✔ missing, blank, unknown or 'user' status with accessLevel 0 is limited (fail closed)
✔ limited user without a CID in session gets nothing
✔ staff roles keep access to any CID (unchanged behaviour)
✔ no session or empty target CID is denied
✔ per-officer routes check CID ownership
ℹ pass 20
ℹ fail 0
```
`tests/login-audit.test.mjs` จับได้จริง: รันกับโค้ดก่อนแก้ (`git stash push -- src`) -> `✖` 3 จาก 4 ตัว
(ตัวที่ผ่านคือ "no other code writes to useronline" ซึ่งเป็นการยืนยันว่ามีผู้เขียนแค่ 2 ไฟล์); `npx tsc --noEmit` -> 0; `npm run build` -> 0

### เรียกจริงบน dev server
```
POST /api/auth/login {"username":"probe-user","password":""}                           -> 400 username and password required
POST /api/auth/login {"username":"probe-user","password":"Probe-Secret-123","captcha":"XXXXXX"} -> 401 Invalid verification code
server log: "Login audit insert failed ... Authentication failed against database server" (ถึงขั้น INSERT แล้วล้มที่ DB ของเครื่องนี้)
ค้น "Probe-Secret" ใน server log -> ไม่พบ
```
ยังพิสูจน์ไม่ได้ในเครื่องนี้: แถวที่บันทึกจริงมี password = NULL (ต้องมี DB) — SQL ใน INSERT เป็นค่าคงที่และเทสต์บังคับไว้

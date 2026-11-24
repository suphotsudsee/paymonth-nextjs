# Task Board

| # | งาน | สถานะ | หลักฐาน (test output / Codex review) |
|---|-----|-------|--------------------------------------|
| 0 | ติดตั้ง pstack (CLAUDE.md, Stop hook, scripts) + เขียน PRD.md จากโค้ดเดิม | เสร็จ | ไม่มีการแก้โค้ดแอป; `python scripts/cross_review.py` หลัง commit |
| 1 | [วิกฤต] ปิด/แก้ `POST /api/auth/thaiid-login` ที่ออก session จาก `pid` ใน body โดยไม่ตรวจ (PRD ข้อ 8.1) | เสร็จ | ดู "หลักฐาน: งาน #1" ด้านล่าง |
| 2 | [สูง] ตรวจสิทธิ์เจ้าของข้อมูลใน API payperson และ route รายคนที่ใช้แค่ `verifySession` (PRD 8.2) | เสร็จ | ดู "หลักฐาน: งาน #2" ด้านล่าง |
| 2b | [สูง] route ฝั่งงานคลัง (นำเข้า paydirect, เช็ค, ฎีกา, หน่วยงาน, รายงาน, export KTB, users) ยังไม่ตรวจบทบาท — USER เรียกได้ (PRD 8.3); `/api/users` GET คืนคอลัมน์ password ด้วย | เสร็จ | ดู "หลักฐาน: งาน #2b" ด้านล่าง |
| 2d | [วิกฤต] แก้ #2/#2b ที่ไม่ได้ผลกับข้อมูลจริง: ผู้ใช้ทั่วไป 12,128 คนมี `accessLevel = 1` → `isStaff`/`hasAdminAccess` ให้สิทธิ์เจ้าหน้าที่+admin (ดูสลิปคนอื่น, จัดการ users) | เสร็จ (โค้ด ยังไม่ commit) | ดู "หลักฐาน: งาน #2d" ด้านล่าง |
| 2c | [กลาง] จำกัด EDITOR ตามหน่วยงาน และให้ middleware ใช้เกณฑ์เดียวกับ `canAccessCid` (status ว่าง = สิทธิ์จำกัด) | รอ | |
| 3 | [สูง] เลิกบันทึกรหัสผ่านลง `useronline` (PRD 8.4) | เสร็จ (โค้ด) — **รอคนรัน SQL ล้างแถวเก่าบน DB จริง** | ดู "หลักฐาน: งาน #3" ด้านล่าง |
| 4 | [สูง] บังคับตั้ง `AUTH_SECRET` (ไม่มี fallback) (PRD 8.5) | เสร็จ (โค้ด) — **ต้องตั้ง AUTH_SECRET ใหม่ใน .env ของ server ก่อน push** | ดู "หลักฐาน: งาน #4" ด้านล่าง |
| 5 | [กลาง] export KTB ใช้ `salary.BANKID` แทน JOIN ตาม CID (PRD 8.7) | รอ | |
| 6 | ตั้งระบบเทสต์ของแอป (ยังไม่มีเลย) ก่อนเริ่มงาน 1–5 | รอ | |
| 7 | ย้ายการโหลดข้อมูลไป Server Components / Server Actions ให้เร็วใกล้ PHP (PRD ข้อ 10) — 34 หน้า client | รอ (วางแผนแล้ว) | เริ่มที่วัด baseline + หน้าทดลอง payperson/สลิป ก่อนทำหน้าที่เหลือ |
| 8 | ตั้ง DB local (MariaDB 10.11 Docker) จาก dump `test-paymonth.sql` + smoke test ของงาน #1–#4 กับข้อมูลจริง | เสร็จ | ดู "หลักฐาน: งาน #8" ด้านล่าง; คู่มือ `docs/LOCAL_DEV.md` |

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

## หลักฐาน: งาน #4 — AUTH_SECRET ไม่มี fallback และห้ามใช้ค่าที่หลุด

### สิ่งที่พบ
- `src/lib/auth.ts` มี `process.env.AUTH_SECRET || '<ค่า 64 ตัวอักษร>'` และ **`.env` ในเครื่องใช้ค่าเดียวกับ fallback นั้น**
  ค่านี้อยู่ใน git history แล้ว ใครเห็น repo ก็เซ็น JWT เป็น admin ได้ — ถ้า server ใช้ค่าเดียวกัน แปลว่าระบบจริงปลอม session ได้
- ค่าเดียวกันอยู่ใน `thaiid-login-package/src/lib/auth.ts` (ชุดไฟล์ที่ก๊อปไปโปรเจกต์อื่น)

### สิ่งที่เปลี่ยน
- `src/lib/authSecret.ts` (ใหม่, ไม่ import อะไร ใช้ได้ใน middleware/edge): `getAuthSecretKey()` อ่าน `AUTH_SECRET` ตอนใช้งาน
  แล้ว throw `AuthSecretError` ถ้า **ไม่ตั้ง / เป็นค่า fallback เก่าที่หลุด / สั้นกว่า 32 ไบต์** (HS256 = HMAC-SHA256, RFC 7518 ข้อ 3.2)
  ข้อความ error บอกวิธีสร้างค่าใหม่ และไม่พิมพ์ค่า secret
- `src/lib/auth.ts`: ลบ fallback; `signSession`, `verifySession`, `signCaptcha` ใช้ `getAuthSecretKey()`;
  ใน `verifySession` อ่านกุญแจ **นอก** try/catch เพื่อให้ตั้งค่าผิดเป็น error ชัดเจน ไม่กลายเป็น "token ไม่ถูกต้อง" เงียบๆ
- แก้เหมือนกันใน `thaiid-login-package/` + README ของ package บอกว่า AUTH_SECRET บังคับและต้องสร้างใหม่ทุกโปรเจกต์
- `.env` ในเครื่อง (ไม่อยู่ใน git): เปลี่ยน `AUTH_SECRET` เป็นค่าสุ่มใหม่ 32 ไบต์ (hex 64 ตัว) บรรทัดอื่นไม่แตะ

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
✔ missing or blank secret is rejected
✔ the old hardcoded fallback is rejected even if set explicitly
✔ secrets shorter than 32 bytes are rejected
✔ a random 32-byte hex secret is accepted and encoded as UTF-8 bytes
✔ error message never echoes the secret value
✔ auth.ts has no fallback and validates the key before any auth path
✔ NextAuth config is lazy and validates AUTH_SECRET first
✔ package copy of authSecret.ts matches the app
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
ℹ pass 28
ℹ fail 0
```
`tests/auth-secret.test.mjs` ตัวที่ตรวจ `auth.ts` จับได้จริง: รันกับ `auth.ts` เดิม -> `✖ auth.ts has no fallback ...`
`npx tsc --noEmit` -> 0; `npm run build` -> 0 (อ่าน secret ตอน runtime จึง build ได้แม้ยังไม่ตั้ง)

### เรียกจริงบน dev server
token "forged" = JWT admin ที่เซ็นด้วยค่า fallback เก่า (สิ่งที่ผู้โจมตีทำได้จาก git history)

| คำขอ | AUTH_SECRET = ค่าสุ่มใหม่ | AUTH_SECRET = ค่าเก่าที่หลุด (ทดสอบชั่วคราว) |
|------|--------------------------|------------------------------------------|
| GET /api/auth/captcha | 200 | 500 + log `AuthSecretError: AUTH_SECRET is a publicly known value ...` |
| GET /api/auth/me ด้วย token forged | **401** | 500 (ไม่รับ session ใดๆ) |
| GET /deegars ด้วย token forged | **307 -> /login** | 500 (middleware ปฏิเสธ) |
| GET /api/auth/me ด้วย token ที่เซ็นด้วยค่าใน .env | 200 | — |
| GET /deegars ด้วย token ที่เซ็นด้วยค่าใน .env | 200 | — |

### Codex รอบ 1 (EXIT=1) — แก้แล้ว
- ตรวจ secret เฉพาะเมื่อมี cookie `session`: คำขอที่มีแค่ cookie ของ NextAuth ข้ามการตรวจ และ NextAuth ยังเข้ารหัส/ถอด cookie
  ด้วยค่าที่หลุดได้ -> (1) `verifySession` อ่านกุญแจก่อน `if (token)` และก่อน `nextAuth()`;
  (2) `src/auth.ts` ใช้ config แบบ lazy `NextAuth(() => { getAuthSecretKey(); return { secret: process.env.AUTH_SECRET, ... } })`
  ตรวจทุกครั้งที่ NextAuth ถูกใช้ (ทำเหมือนกันใน package) + เทสต์ 2 ตัว
- เรียกจริง เฉพาะเส้นทาง NextAuth:

| คำขอ | ค่าสุ่มใหม่ | ค่าเก่าที่หลุด |
|------|-----------|--------------|
| GET /api/auth/session (handler ของ NextAuth) | 200 `null` | **500** + log `AuthSecretError` (จาก config แบบ lazy) |
| GET /api/auth/me มีแค่ cookie `authjs.session-token` | 401 | **500** + log `AuthSecretError` (จาก verifySession) |
| GET /api/auth/me ไม่มี cookie | 401 | 500 |

### สิ่งที่คนต้องทำก่อน push (main deploy อัตโนมัติผ่าน `.github/workflows/deploy.yml`)
1. บน server: ตั้ง `AUTH_SECRET` ใหม่ใน `.env` ของ `/home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th`
   (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) — ถ้ายังเป็นค่าเก่า/ไม่ได้ตั้ง หลัง deploy ทุกหน้าที่ต้อง login จะเป็น 500
2. ผู้ใช้ทุกคนต้อง login ใหม่ (session เดิมเซ็นด้วยกุญแจเก่า)
3. NextAuth ใช้ `AUTH_SECRET` ตัวเดียวกันเข้ารหัส cookie ของ ThaiID — เปลี่ยนแล้ว flow ThaiID ที่ค้างอยู่ต้องเริ่มใหม่

## หลักฐาน: งาน #8 — รันบนเครื่องกับ DB local

### สิ่งที่ทำ
- `docker-compose.local.yml`: MariaDB 10.11 (รุ่นเดียวกับ server ตาม header ของ dump) ที่ `127.0.0.1:3310`
  (3306 = XAMPP ซึ่งรหัสใน `.env` เดิมเข้าไม่ได้)
- import `test-paymonth.sql` (826MB): 1 นาที 40 วินาที, EXIT=0, 16 ตาราง (salary 332,613 แถว, paydirect 564,977 แถว)
- รัน `prisma/sql/2026-11-23_clear_useronline_passwords.sql` บนสำเนา local: 14,659 → 0 แถวที่มีรหัสผ่าน
  **DB บน server ยังมีอยู่** (dump มาจากที่นั่น) — งาน #3 ยังรอคนรันบน server
- `.env` ชี้ `DATABASE_URL` มาที่ DB local (สำรองค่าเดิมเป็น `.env.backup-before-localdb`); `npx prisma validate` ผ่าน
- สร้างบัญชีทดสอบเฉพาะ DB local `localadmin` / `localuser` (รหัสสุ่มอยู่ใน `.env.db.local`)
- `.gitignore`: เพิ่ม `/*.sql` กันไฟล์ dump (ข้อมูลบุคคลจริง) หลุดเข้า git
- `scripts/local-smoke.mjs`: ยิง API จริงบน dev server (อ่าน captcha จาก SVG แล้ว login)

### `node scripts/local-smoke.mjs` (output จริง — หลังแก้ตาม Codex 2 รอบ: ไม่ login ต้องได้ 401; รหัสผิดต้องได้ "Invalid credentials" และไม่มี session cookie (ไม่ใช่ 401 จาก captcha); fetch ตอน login ใช้ `redirect: 'error'`; งวดสลิปมาจาก `LOCAL_TEST_USER_PERIOD`)
```
✔ รหัสผิด -> 401 Invalid credentials ไม่มี session — status 401, error "Invalid credentials"
✔ admin login -> 200 + session cookie — status 200
✔ user login -> 200 + session cookie — status 200
✔ ไม่ login เรียกข้อมูลรายคน -> 401 — status 401
✔ user /api/auth/me -> 200 — status 200
✔ user ดูข้อมูลตัวเอง -> 200 — status 200, 27ms, 730 bytes
✔ user ดูสลิปตัวเอง 2569/05 -> 200 — status 200, 20ms
✔ user ดูข้อมูลคนอื่น -> 403 (กัน IDOR) — status 403
✔ user เรียก /api/users -> 403 — status 403
✔ user เรียก /api/cheques (งานคลัง) -> 403 — status 403
✔ admin ดูข้อมูลคนอื่น -> 200 — status 200, 20ms
✔ admin /api/users -> 200 — status 200, 18ms
✔ admin /api/users ไม่ส่ง hash รหัสผ่าน
✔ admin /api/cheques -> 200 — status 200, 12ms
✔ หน้า / -> 200/3xx — status 307, 8ms
✔ หน้า /login -> 200/3xx — status 200, 41ms

ALL PASSED
```
- ตาราง `useronline` หลัง login: แถวใหม่ทั้งหมด `password IS NULL` (งาน #3 ทำงานกับ DB จริง)
- `npm test`: pass 28, fail 0
- เปิดหน้าสลิป `/officers/payperson/<cid>/2569/05` ในเบราว์เซอร์ด้วย localuser: แสดงชื่อ หน่วยงาน รายรับ 1,550.00 บาท
  และเลขบัญชี ครบ; server log ไม่มี error
- ข้อสังเกต: CID แรกที่ลองมีแถว salary 10/2569 `PNUMBER=P000000000`, `MONEY=0.00` → สลิปแสดง 0.00 ตรงกับ DB (ไม่ใช่บั๊กของแอป)

## หลักฐาน: งาน #2d — บทบาทต้องดูจาก status ไม่ใช่ accessLevel

### ต้นเหตุ (พบระหว่างผู้ใช้ทดสอบ login บนเครื่อง 2026-11-24)
ตาราง `user` ใน DB local (12,140 แถว) แยกตาม status/accessLevel:

| status | accessLevel | จำนวน |
|---|---|---|
| user | 1 | 12,128 |
| manager | 1 | 4 |
| user | 0 | 3 |
| admin | 9 | 2 |
| `๊user` (มีวรรณยุกต์นำหน้า) | 1 | 1 |
| manager | 8 | 1 |
| นางสาว | 1 | 1 |

`isStaff` (งาน #2) และ `hasAdminAccess` (เดิม) ถือ `accessLevel >= 1` เป็นเจ้าหน้าที่/admin → ผู้ใช้ทั่วไปเกือบทุกคนผ่าน
สมมติฐานใน #2 ที่ว่า "user ทั่วไปมี accessLevel 0" ผิด — เทสต์และ live check ของ #2/#2b ใช้ token ที่ตั้ง accessLevel 0 เอง จึงไม่เจอ
(smoke test ของงาน #8 ผ่านด้วยเหตุผลเดียวกัน: บัญชี localuser ไม่ได้มี accessLevel 1 แบบข้อมูลจริง — ควรเพิ่มกรณีนี้ใน `scripts/local-smoke.mjs`)

### สิ่งที่เปลี่ยน
- `src/lib/permissions.ts`: เพิ่ม `roleOf(session)` ดูจาก status อย่างเดียว เทียบตรงตัว (ไม่สนตัวพิมพ์/ช่องว่าง): `admin`/`manager` → ADMIN, `editor` → EDITOR, อื่นๆ/ว่าง → USER; `isStaff` = ไม่ใช่ USER; `hasAdminAccess` = ADMIN
- `src/lib/session.ts`: `deriveRole` = `roleOf` (เดิม status ไม่รู้จัก + accessLevel ≥ 1 → ADMIN)
- `src/middleware.ts`: ผู้ใช้สิทธิ์จำกัด = `roleOf(session) === 'USER'` (เดิมเทียบ `status === 'user'` ตรงๆ — บัญชี "นางสาว"/"๊user" หลุด)
- `src/app/api/banks/route.ts`, `banks/[id]/route.ts`: `canManageBanks` = `hasAdminAccess` (เดิมใช้ accessLevel ≥ 1 เหมือนกัน)
- ผลข้างเคียงที่ตั้งใจ: บัญชี status "นางสาว" และ "๊user" (accessLevel 1) จากเดิมได้ ADMIN ใน `deriveRole` → เป็น USER — ถ้าเป็นเจ้าหน้าที่จริงต้องแก้ status ใน DB

### เทสต์ — `npm test` (output จริง)
```
ℹ tests 30
ℹ pass 30
ℹ fail 0
```
เทสต์ใหม่ใน `tests/permissions.test.mjs`: status user/ว่าง/ไม่รู้จัก × accessLevel (0,1,2,8,9,99,...) ต้องเป็น USER ทุกกรณี; admin/manager/editor ไม่ขึ้นกับ accessLevel; ห้ามมี `accessLevel >= n` ในไฟล์ตรวจสิทธิ์
เทียบโค้ดเดิม (HEAD) กับใหม่ ด้วย session `{status:"user", accessLevel:1}`:
```
HEAD (old)           isStaff: true  hasAdminAccess: true  canAccessCid(other): true
working tree (new)   isStaff: false  hasAdminAccess: false  canAccessCid(other): false
```

### เรียกจริง — `next build` + `next start -p 9104` กับ DB local (token เซ็นด้วย AUTH_SECRET ของเครื่อง, ผู้ใช้จริง status=user accessLevel=1)
| คำขอ | user (status=user, lvl 1) | admin |
|---|---|---|
| สลิปตัวเอง `/api/officers/<own>/personal` | 200 | 200 |
| สลิปคนอื่น `/api/officers/<other>/personal` | 403 | 200 |
| ข้อมูลคนอื่น `/api/officers/<other>` | 403 | 200 |
| เงินเดือนคนอื่น `/api/officers/<other>/salaries` | 403 | 200 |
| บัญชีธนาคารคนอื่น `/api/banks?cid=<other>` | 403 | 200 |
| `/api/users` | 403 | 200 |
| `/api/useronline` | 403 | 200 |
| `/api/cheques` | 403 | 200 |
| `/api/reports/taxtitle` | 403 | 200 |
| หน้า `/officers`, `/cheques` | 307 → หน้าตัวเอง | – |

ก่อนแก้ (dev server 9102 ที่ยังถือโค้ดเดิมในหน่วยความจำ) สลิปคนอื่นและข้อมูลคนอื่นได้ 200 — dev server ไม่โหลด permissions ใหม่ให้ route ที่ compile ไว้แล้ว จึงวัดด้วย production build แทน

### Codex รอบ 1 (CHANGES_REQUESTED) — แก้แล้ว
- `permissions.ts:20` จับ status แบบ substring (`includes`) → ค่าอย่าง `not-admin`, `former-manager`, `non-editor` ได้สิทธิ์สูง ขัดกับที่บอกว่า fail closed
- แก้: ใช้ allowlist ตรงตัว (`ADMIN_STATUSES`, `EDITOR_STATUSES`) + เทสต์ว่า `not-admin`, `former-manager`, `non-editor`, `Super Admin`, `admin2`, `administrator`, `editor-trainee` เป็น USER ทุก accessLevel
- ข้อมูลจริงมีแค่ `user`/`manager`/`admin` (และ 2 ค่าที่สะกดผิด) จึงไม่มีบัญชีไหนเสียสิทธิ์จากการเปลี่ยนนี้; `npm test` หลังแก้: tests 30, pass 30, fail 0; `tsc --noEmit` ผ่าน

### ยังเหลือ
- หน้า `/tools/*`, `/reports/*`, `/stations`, `/cpays`, `/charts` ไม่อยู่ใน `PROTECTED_PATHS` ของ middleware: ผู้ใช้ทั่วไปเปิดหน้าได้ (เห็นแค่โครงหน้า ข้อมูลโดน API ตอบ 403) → รวมในงาน #2c


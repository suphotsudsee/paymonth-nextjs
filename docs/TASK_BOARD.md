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
| 9 | ช่องรหัสผ่านมีปุ่มรูปตา (แสดง/ซ่อน) ในหน้า login และฟอร์มจัดการผู้ใช้ ซ่อนกลับเองเมื่อส่งฟอร์ม | เสร็จ (โค้ด ยังไม่ commit) | ดู "หลักฐาน: งาน #9" ด้านล่าง |
| 10 | เมนูรายงานเร็วขึ้น: index 5 ตัว + แก้ query (ผลเท่าเดิม) | เสร็จ (โค้ด ยังไม่ commit) — **ต้องรัน `prisma/sql/2026-11-24_report_indexes.sql` บน DB server** | ดู "หลักฐาน: งาน #10" ด้านล่าง |
| 11 | หน้าจอทั้งเว็บใช้ Bootstrap 5.3 (PRD ข้อ 11): 11a ติดตั้ง+root layout+globals · 11b login+PasswordInput (`input-group`) · 11c AppHeader (navbar+dropdown+collapse มือถือ)/AppFooter · 11d รายงาน `/reports/*` · 11e ทะเบียน deegars/cheques/regisdeegars/stations/cpays · 11f officers/* + สลิป/พิมพ์ · 11g tools/users/useronline/import + charts · 11h ลบ CSS module ที่ไม่ใช้, `npm test` + `next build` + ตรวจในเบราว์เซอร์ จอกว้าง/มือถือ | เสร็จ (โค้ด ยังไม่ commit) — ตรวจกับข้อมูลจริงแล้ว เหลือสั่งพิมพ์สลิป A4 ด้วยมือ | ดู "หลักฐาน: งาน #11" ด้านล่าง |
| 12 | แบ่งหน้ามาตรฐานทุกหน้า + เลือกจำนวนต่อหน้า 5/10/15/50/100 (PRD 11.1): 12a `src/lib/pagination.ts` + `Pagination.tsx` + เทสต์ · 12b API เพดาน 50 → 100 · 12c หน้าทะเบียน/รหัส/ผู้ใช้ · 12d หน้ารายงาน (รวมส่งกรุงไทย, taxtmonth, taxdept/group ที่เดิมไม่มีปุ่มเปลี่ยนหน้า) · 12e ค้นหาฎีกา/เช็ค แบ่งหน้า + ยอดรวมทั้งผลค้นหาจาก API · 12f หน้ารายคน officers/[cid]/* · 12g tsc/test/build + ตรวจในเบราว์เซอร์ | เสร็จ (โค้ด ยังไม่ commit) | ดู "หลักฐาน: งาน #12" ด้านล่าง |
| 13 | ตัวเลขจำนวนเงินชิดขวาทุกหน้า (PRD 11.2) | เสร็จ (โค้ด ยังไม่ commit) | ดู "หลักฐาน: งาน #13" ด้านล่าง |
| 14 | ประวัติจ่ายตรงรายคนช้า: index `paydirect (C, A, B)` (PRD 10.2) | เสร็จ (โค้ด ยังไม่ commit) — **ต้องรัน `prisma/sql/2026-11-25_paydirect_cid_index.sql` บน DB server** | ดู "หลักฐาน: งาน #14" ด้านล่าง |
| 15 | คู่มือ deploy ไป server (`docs/DEPLOY.md`): สำรอง, ไฟล์ค้างบน server ที่ทำให้ deploy ล้ม 3 ครั้ง, `.env`, SQL 3 ไฟล์, ตรวจหลัง deploy, ย้อนกลับ | เสร็จ (เอกสาร ยังไม่ commit) — ยังไม่ได้ทดลองบน server จริง | ดู "หลักฐาน: งาน #15" ด้านล่าง |
| 16 | รวมการแก้บน server เข้า repo (PRD 12): BigInt ตอนสร้างฎีกา, ชื่อไฟล์ export ภาษาไทย, ส่งออก Excel ทะเบียนคุมหลักฐานการจ่าย (+isStaff), คำผิด ทดรอง, ค้นหาฎีกาแสดงทีละรายการเงิน (+ยอดรวมไม่นับภาษีซ้ำ) | เสร็จ — deploy แล้ว (#17) |  ดู "หลักฐาน: งาน #16" ด้านล่าง |
| 17 | Deploy `4ac8434` ขึ้น test-paymonth (ssh ผ่าน VPN) + รัน SQL 3 ไฟล์ | เสร็จ — แอปล่มราว 2.5 นาทีระหว่าง deploy (ดูหลักฐาน); **หน้า "รายงานทั้งหมด" บน server ยังช้า ~5 วินาที** (local 0.5–1 วินาที) | ดู "หลักฐาน: งาน #17" ด้านล่าง |
| 18 | รายงานทั้งหมดบน server ช้า ~5 s: รวมยอด salary ก่อน join officer/cpay (ผลเท่าเดิม) (PRD 10.3) | เสร็จ — deploy `851a4e7` แล้ว: server ~5 s → ~1.7 s | ดู "หลักฐาน: งาน #18" ด้านล่าง |
| 19 | ย้าย test-paymonth ไป Coolify (coolify.phoubon.in.th): Dockerfile + `output: "standalone"`, MariaDB ใหม่ใน Coolify + import dump, ชี้โดเมนเดิม | **พักไว้** — Coolify ตั้งแล้วแต่ DB ว่าง, `DATABASE_URL` ยังชี้ DB เก่า, DNS ยังชี้ server เดิม (ดูหลักฐาน "สถานะตอนพัก") | ดู "หลักฐาน: งาน #19" ด้านล่าง |

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

## หลักฐาน: งาน #9 — ช่องรหัสผ่านแบบมีปุ่มตา

### สิ่งที่เปลี่ยน
- `src/components/PasswordInput.tsx` (ใหม่): ช่องรหัสผ่าน + ปุ่ม `Eye`/`EyeOff` จาก `lucide-react` (มีในโปรเจกต์แล้ว หน้าตาแบบเดียวกับ fa-eye ไม่ต้องเพิ่ม Font Awesome)
  ปุ่มเป็น `type="button"`, มี `aria-label`/`aria-pressed`; ซ่อนกลับเองเมื่อ `<form>` ที่ครอบถูก submit/reset และเมื่อ `concealKey` เปลี่ยน
- `src/app/(auth)/login/page.tsx`: ใช้ `PasswordInput` (`autoComplete="current-password"`)
- `src/app/(dashboard)/tools/users/page.tsx`: ใช้ `PasswordInput` (`autoComplete="new-password"`); ฟอร์มนี้ไม่มี `<form>` จึงเพิ่ม `submitCount` ทุกครั้งที่กดบันทึก (ก่อนเรียก API → บันทึกไม่ผ่านก็ซ่อน) ส่งเป็น `concealKey`; ปิด modal = unmount = ซ่อนอยู่แล้ว

### Codex รอบ 1 (CHANGES_REQUESTED) — แก้แล้ว
- รหัสที่กดดูไว้ค้างอยู่หลังส่งฟอร์มถ้าฟอร์มยังเปิดอยู่ (เช่น login ไม่ผ่าน) → เพิ่มการซ่อนเมื่อ submit/reset และ `concealKey` ตามข้างบน + เทสต์ `tests/password-input.test.mjs`
- ข้อจำกัด: ยังไม่มี DOM สำหรับเทสต์ (ไม่มี jsdom และไม่เพิ่ม dependency เพื่องานนี้) เทสต์จึงตรวจการผูก event จากซอร์ส ส่วนพฤติกรรมจริงตรวจในเบราว์เซอร์ด้านล่าง

### เทสต์ — `npm test` (output จริง)
```
ℹ tests 36
ℹ pass 36
ℹ fail 0
```

### ตรวจในเบราว์เซอร์ (dev server localhost:9102 หน้า /login)
| ขั้นตอน | type ของช่องรหัสผ่าน | ป้ายปุ่ม |
|---|---|---|
| เปิดหน้า | password | แสดงรหัสผ่าน |
| กดตา | text | ซ่อนรหัสผ่าน |
| กดตาซ้ำ (ไม่ส่งฟอร์ม) | password | แสดงรหัสผ่าน |
| กดตาให้แสดง แล้วกด Login ด้วย captcha ผิด (login ไม่ผ่าน ยังอยู่หน้า /login) | password | แสดงรหัสผ่าน |

หน้าจัดการผู้ใช้ยังไม่ได้ตรวจในเบราว์เซอร์ (ต้อง login admin)

## หลักฐาน: งาน #10 — เมนูรายงานเร็วขึ้น

### วิธีวัด
- `next build` + `next start -p 9104` กับ DB local (MariaDB 10.11, MyISAM: salary ~332,600 แถว, deegar ~44,000, cheque ~24,600, paydirect ~565,000)
- เรียก API ด้วย token admin รายการละ 3 ครั้ง เอาค่ากลาง; ปีที่ใช้ = 2568 (ปีล่าสุดที่ครบ 12 เดือน), ช่วงวันที่ = 1 เดือนล่าสุดของ `cheque.PAYDATE`
- เก็บ sha1 ของ body ทุกครั้งเพื่อเทียบว่าผลไม่เปลี่ยน

### ผล (ms)
| รายงาน | ก่อน | หลัง | body |
|---|---|---|---|
| รายงานทั้งหมด (เปิดหน้าครั้งแรก ไม่กรอง) | 4,235 | 729 | เหมือนเดิม |
| รายงานทั้งหมด กรองปี+เดือน | 258 | 14 | เหมือนเดิม |
| รายงานทั้งหมด ค้นชื่อ | 1,750 | 737 | เหมือนเดิม |
| ตามวันที่จ่าย 1 เดือน | 4,878 | 15 | ชุดข้อมูลเดิม* |
| ใบสำคัญจ่าย 1 เดือน | 2,598 | 16 | ชุดข้อมูลเดิม* |
| ภาษีรายตัว (taxtitle) ปี | 338 | 101 | เหมือนเดิม |
| ภาษีตามหน่วยงาน ปี | 331 | 102 | เหมือนเดิม |
| ภาษีรายเดือน ปี | 307 | 24 | เหมือนเดิม |
| สรุปฎีกา (รายการ) | 2,219 | 506 | เหมือนเดิม |
| KTB ตามเช็ค / export | 398 / 405 | 20 / 16 | เหมือนเดิม |
| KTB ตามฎีกา / export, สรุปฎีการายตัว | 50–64 | 9–12 | เหมือนเดิม |
| รายการฎีกา (`/api/salaries/deegars`) | **เกิน 10 นาที** (query ค้างใน DB 613 วินาที ต้อง KILL) | 537 | – |
| paydirect report | **500 ทุกครั้ง** (BigInt serialize ไม่ได้) | 324 (200) | แก้บั๊ก |

\* ตามวันที่จ่าย/ใบสำคัญจ่าย: body ต่างกันได้ทุกครั้งที่เรียกแม้โค้ดเดิม (baseline 2 รอบได้ sha ต่างกัน `a3673ae868e6` / `66c284656363`) เพราะ ORDER BY มีค่าซ้ำแล้วตัดด้วย LIMIT
ตรวจชุดข้อมูลทั้งหมด (ไม่ LIMIT) แบบใช้ index ใหม่ vs `IGNORE INDEX`: bydate 346 แถว sha `31f1a45927be` = `31f1a45927be` (22 ms vs 2,161 ms); payvouchers 346 แถว `e2ddd8a13711` = `e2ddd8a13711` (8 ms vs 1,005 ms)

### สิ่งที่เปลี่ยน
1. `prisma/sql/2026-11-24_report_indexes.sql` — **ต้องรันบน DB server** (local รันแล้ว ใช้รวม ~2 วินาที):
   - ขั้นแรกตรวจอย่างเดียว (ไม่แก้ข้อมูล): นับ key ของ salary/regisdeegar ที่ขึ้นต้นด้วยเว้นวรรค ใส่ตารางชั่วคราวที่มี `CHECK (= 0)` — ถ้าไม่ใช่ 0 script จะ error และหยุดก่อนสร้าง index (local: 0)
   - `salary(PNUMBER, NODEEGAR, DUPDATE, ID)`, `salary(YEARTHAI, MONTHTHAI, CID, IDPAY)`, `deegar(CHEQUE)`, `cheque(PAYDATE)`, `bank(CID)` (schema.prisma ประกาศไว้แต่ DB ไม่มี)
2. subquery "salary แถวล่าสุดของฎีกา" (ktbcheque, ktbcheque/export, salaries/deegars) และ join regisdeegar สร้างจาก `src/lib/keyJoin.ts`: ถ้า key ของ salary/regisdeegar ไม่ขึ้นต้นด้วยเว้นวรรค (ตรวจตอนรันด้วย `src/lib/keyHygiene.ts` จำผล 5 นาที) ใช้ `s2.X = TRIM(deegar.X)` ซึ่งใช้ index ได้ ไม่อย่างนั้นใช้ `TRIM(s2.X) = TRIM(deegar.X)` แบบเดิม
3. `reports/all`: นับกลุ่มแยกตามงวด (ปี/เดือน) แล้วเรียงชื่อเฉพาะงวดที่หน้านั้นครอบคลุม (`src/lib/reportPaging.ts`) แทนเรียงทั้ง ~111,000 กลุ่ม; ยอดรวมรายการ = ผลรวมของงวด; ยอดเงินรวมรันพร้อมกัน
4. `salaries/deegars`, `summarydeegar`: query นับจำนวนเริ่มพร้อม query หน้าปัจจุบัน (มี `.catch` กัน unhandled rejection)
5. ภาษี 3 รายงาน: ปีตั้งต้น = ปีตัวเลข 4 หลักล่าสุด — เดิม `MAX(YEARTHAI)` ได้ `'YEAR'` (แถวขยะ 1 แถว) → เปิดรายงานโดยไม่เลือกปีได้ตารางว่าง
6. `paydirect/report`: ID ที่เป็น BIGINT แปลงด้วย `bigintToJson` (`src/lib/json.ts`) — อยู่ในช่วงปลอดภัยเป็น number, เกินเป็น string ไม่ปัดเศษ

### ทำไมผลเท่าเดิม
- index ไม่เปลี่ยนชุดผลลัพธ์ (ตรวจด้วย IGNORE INDEX ด้านบน)
- เลิก TRIM เฉพาะฝั่งที่ถูกค้นด้วย index: ทุก route ที่เขียน salary/regisdeegar trim ก่อนบันทึก + SQL ตรวจว่าไม่มีช่องว่างนำหน้า (ต้องเป็น 0 ก่อนสร้าง index), ช่องว่างท้ายไม่มีผลกับ `=` (collation PAD SPACE); ฝั่ง deegar ยัง TRIM
  เทสต์กับตารางชั่วคราว: deegar แบบ ปกติ / นำหน้า / ท้าย / ทั้งสองด้าน / ไม่มีคู่ → join เก่ากับใหม่ได้คู่เดียวกันทุกแถว
- reports/all: เทสต์กับ DB จริงเทียบ query เก่า/ใหม่ ที่ offset 0, 1, 5, 9, 250, กลาง, ท้าย, เกินท้าย × (ไม่กรอง, ค้นชื่อ, กรองปี) ได้ลำดับ (ปี/เดือน/ชื่อ) ตรงกันทุกตำแหน่ง และยอดรวม 111,215 ตรงกับ COUNT เดิม

### Codex รอบ 1 (CHANGES_REQUESTED) — แก้แล้ว
- เลิก TRIM ทั้งสองฝั่ง ทำให้ค่าที่มีช่องว่างนำหน้าหลุดการจับคู่ → คง TRIM ฝั่ง deegar, ล้างข้อมูลฝั่งที่ถูกค้น + เทสต์ว่าทุก writer trim + เทสต์ช่องว่างหลายแบบกับ DB
- `Number(r.ID)` ปัดเศษ BIGINT ที่เกิน 2^53 → `bigintToJson` + เทสต์ `9007199254740993n` → `"9007199254740993"`
- ถอนการแก้ `summarydeegar` (join cheque เดิมไม่ได้ TRIM ฝั่งที่มี index อยู่แล้ว) และ `salaries/cheques` (ไม่ช้า) กลับเป็นของเดิม

### Codex รอบ 2 (CHANGES_REQUESTED) — แก้แล้ว
- SQL รอบก่อน trim ฝั่ง salary อย่างเดียว: ถ้า server มีค่าเก่าที่ช่องว่างนำหน้าทั้งสองฝั่ง (เช่น `' P1'` ทั้งใน salary และ deegar) join แบบ `=` ตรงๆ ในรายงานอื่น (summarydeegar ฯลฯ) จะหลุด
- แก้: script ไม่แก้ข้อมูลแล้ว ตรวจช่องว่างนำหน้าใน key ทั้ง 4 ตาราง ต้องเป็น 0 ถึงจะสร้าง index ต่อ + เทสต์ข้อมูลเก่า `' P4'` ทั้งสองฝั่ง: join เก่าจับคู่ได้ join ใหม่ไม่ได้ และการตรวจจับได้ (นับได้ 1)
- หมายเหตุ: DB local ถูก trim ไปแล้ว 1 แถวจาก script รอบก่อน (`salary.NODEEGAR` ที่มีช่องว่างท้าย — ไม่มีผลกับ `=`)

### Codex รอบ 3 (CHANGES_REQUESTED) — แก้แล้ว
- pre-check แค่พิมพ์จำนวน script ยังรันต่อได้ และโค้ดใช้ join แบบเร็วโดยไม่สนผลตรวจ
- แก้ 2 ชั้น: (1) script ใส่จำนวนลงตารางชั่วคราวที่มี `CHECK (leading_space_keys = 0)` → ไม่ใช่ 0 = error หยุดก่อน CREATE INDEX (เทสต์กับ DB ว่า INSERT ถูกปฏิเสธจริง); (2) โค้ดตรวจข้อมูลเองตอนรัน ถ้าพบ key ขึ้นต้นด้วยเว้นวรรคจะใช้ join แบบเดิม (เทสต์กับตารางชั่วคราว: ข้อมูลเก่า `' P4'` ทั้งสองฝั่ง → join แบบเดิมจับคู่ได้ตรงกับของเดิม)
- รันทั้ง script บน DB local ใน connection เดียว: ผ่าน pre-check และ index ครบ 5 ตัว; วัดผลรอบสุดท้ายอยู่ในตารางด้านบน (รวมเวลาการตรวจตอนรันแล้ว)

### เทสต์ — `npm test` (output จริง, รวมเทสต์ที่ต่อ DB local)
```
ℹ tests 48
ℹ pass 48
ℹ fail 0
ℹ skipped 0
```

### ยังเหลือ / ข้อสังเกต
- ค้นชื่อในรายงานทั้งหมด (~0.9 วินาที) ใช้ `NAME LIKE '%...%'` ซึ่งใช้ index ไม่ได้ ถ้าต้องเร็วกว่านี้ต้องใช้ FULLTEXT หรือค้นแบบขึ้นต้นด้วย
- สรุปฎีกา (~0.5 วินาที) ช้าที่การนับจำนวนทั้งหมด
- paydirect report ส่ง 1.8 MB ต่อครั้ง (ไม่มีแบ่งหน้า) และใช้ `LIKE '%ปี%'` บนตาราง 565,000 แถว
- ORDER BY ที่มีค่าซ้ำ + LIMIT ใน bydate/payvouchers ทำให้แถวสลับตำแหน่งระหว่างหน้าได้ (มีมาก่อน) — แก้โดยเพิ่ม salary.ID ท้าย ORDER BY ถ้าต้องการ
- DB local ใช้ร่วมกับแชตอื่น (docker): ตอนนี้มี index ใหม่แล้ว


## หลักฐาน: งาน #11 — หน้าจอทั้งเว็บใช้ Bootstrap 5.3

### สิ่งที่เปลี่ยน
- `bootstrap@^5.3.9` (npm) import `bootstrap.min.css` ใน `src/app/layout.tsx` ก่อน `globals.css`; `<html lang="th" data-bs-theme="light">`; **ไม่ใช้ JS ของ Bootstrap**
- `globals.css` เหลือ 4 กฎ: ความกว้างขั้นต่ำตารางใน `.table-responsive` บนจอ ≤ 720px, หัวตารางไม่ตัดบรรทัด, พื้นหลังมืดของ `.modal.d-block`, พื้นขาวตอนพิมพ์
- 11b login: card + form-control + `form-check`, ThaiID เป็น `btn`; `PasswordInput` = `input-group` + `btn btn-outline-secondary` (logic เดิมทุกบรรทัด, ไม่ใช้ inline style แล้ว)
- 11c `AppHeader`: `navbar navbar-expand-lg bg-primary` + `dropdown-menu` คุมด้วย state (คลิกนอก/กด Esc ปิด, กดลิงก์แล้วปิดเมนูมือถือ), เงื่อนไข status `user` ซ่อนเมนูเหมือนเดิม; header/footer `d-print-none`
- 11d–11g ทุกหน้าใน `src/app/(dashboard)` แปลง `styles.X` → class ของ Bootstrap ด้วยสคริปต์ที่ใช้ตารางแปลงชุดเดียว (ชื่อ class เดิมซ้ำกันทุกหน้า เช่น `tableCard`→`card`, `table`→`table table-bordered table-striped table-hover table-sm`, `tableWrapper`→`table-responsive`, `primaryBtn`→`btn btn-primary`, `modalOverlay/modal`→`modal d-block` + `modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down` + `modal-content`, ปุ่มปิด modal → `btn-close`, `error`→`alert alert-danger`, ตัวกรอง→`row g-2` + `col-12 col-sm-6 col-lg-3`) แล้วไล่แก้ inline style ที่เหลือด้วยมือ (`/paydirect`, `/salaries/[cid]`, import-paydirect, หัวข้อ `<h1>` → `h4`)
- ลบ CSS module 19 ไฟล์ (+ `HeaderFooter.module.css`) เหลือ 2 ไฟล์ที่ Bootstrap ทำแทนไม่ได้: แท่งกราฟ `/charts/inout` (ความสูงตามข้อมูล) และสลิป A4 + ลายน้ำ + `@media print` ของ `/officers/paydirect/[payid]`
- `/logo` เดิมเขียน class ของ Tailwind (ไม่ได้ติดตั้ง) → เปลี่ยนเป็น Bootstrap
- เทสต์ใหม่ `tests/bootstrap-ui.test.mjs`: import CSS ใน root layout ก่อน globals, CSS module เหลือแค่ 2 ไฟล์ที่อนุญาต, ไม่มีการโหลด JS ของ Bootstrap/`data-bs-toggle`, PasswordInput ใช้ `input-group`, เงื่อนไขซ่อนเมนูของ status user ไม่เปลี่ยน
- ไม่แตะ API, middleware, สิทธิ์, query; ข้อความที่แสดงเหมือนเดิม (เปลี่ยนแค่ class/markup ห่อ)

### เทสต์ — `npm test` (output จริง)
```
✔ bootstrap is a dependency and its CSS is imported in the root layout before globals.css
✔ only the chart bars and the printable A4 slip keep a CSS module
✔ Bootstrap JS is not loaded (React state drives navbar/dropdown/modal)
✔ PasswordInput uses a Bootstrap input-group with the eye button
✔ header hides the menu for status user exactly as before
✔ starts hidden: type is password until the eye is clicked
✔ form submit and reset hide the password again
✔ concealKey change hides the password
✔ login form uses PasswordInput inside a <form> (submit listener applies)
ℹ tests 53
ℹ pass 51
ℹ fail 0
ℹ skipped 2      <- 2 เทสต์ที่ต่อ DB local ข้ามเพราะ Docker ปิดอยู่ ("database not reachable")
```
`npx tsc --noEmit` ผ่าน; `npx eslint src` = 267 ปัญหา **เท่ากับก่อนแก้** (เทียบ JSON ต่อไฟล์/ต่อ rule กับ commit 81b1385 — ไม่มีปัญหาใหม่)

### Build — `npx next build` (Next 16.0.7 Turbopack)
```
✓ Compiled successfully in 2.3s
✓ Generating static pages using 27 workers (68/68)
```

### ตรวจในเบราว์เซอร์ — production build (`next start -p 9105`)
ใช้พอร์ต 9105 แทน 9104 เพราะ 9104 มี `next start` ของงานก่อนค้างอยู่ (ไม่ได้ปิดของคนอื่น) และเปิดผ่าน `127.0.0.1` เพราะ cookie ของ `localhost` มี session httpOnly ของผู้ใช้จริงจากการทดสอบครั้งก่อนค้างอยู่;
session = JWT ทดสอบ (status admin, CID 0000000000000) เซ็นด้วย AUTH_SECRET ของเครื่อง; **DB local ปิดอยู่ (Docker Desktop ไม่ได้รัน)** ทุกตารางจึงว่าง/ขึ้น alert "Failed to load"
- ไล่ 32 หน้า (iframe กว้าง 1280px และ 390px): ทุกหน้าใน dashboard มี `.navbar`, `.card`, `table.table` (ยกเว้นกราฟ/import/หน้าเลือกสลิปที่ไม่มีตาราง), **ไม่มีหน้าไหนเลื่อนแนวนอนทั้งหน้า (scrollWidth − innerWidth = 0 ทุกหน้า ทั้งสองความกว้าง)**, ไม่เหลือตารางที่ไม่มี class `.table`
  - `/officers/paydirect` และ `/paydirect` ไม่มีเมนูบน — เหมือนเดิม (หน้าเดิมไม่ได้ใส่ `AppHeader`)
  - `/officers/[cid]/banks` เป็น server component ที่ query DB ตรง → error เพราะ DB ปิด (ไม่เกี่ยวกับงานนี้)
- login: `input-group` + ปุ่มตา: ก่อนกด `type=password, aria-label="แสดงรหัสผ่าน", aria-pressed=false` → กดแล้ว `text / ซ่อนรหัสผ่าน / true` → form reset แล้วกลับเป็น `password`
- `/tools/users` บนมือถือ (375×812): modal เต็มจอ (`modal-fullscreen-sm-down`), ช่องรหัสผ่านมีปุ่มตา, กดตาแล้ว `text` → กด Save → `password` (concealKey)
- เมนูบน: จอกว้างกด "ทะเบียนรหัส" แล้ว dropdown เปิด; มือถือกด hamburger แล้วเมนูกาง, กด "รายงาน" แล้วเห็นรายการย่อย 11 รายการ
- `/cheques`: ปุ่ม "+ เพิ่มทะเบียนเช็ค" เปิด modal "Create Cheque" ฟอร์ม 2 คอลัมน์, ปุ่ม `btn-close`, Save/Cancel

### ยังเหลือ / ข้อสังเกต
- **ยังไม่ได้ดูหน้าที่มีข้อมูลจริง** (ตารางยาว, ตัวเลขเงิน, สลิป `/officers/paydirect/[payid]` และหน้าพิมพ์) เพราะ DB local ปิดอยู่ — เปิด Docker แล้วดูซ้ำ โดยเฉพาะสลิป A4 ตอนสั่งพิมพ์
- ระหว่างงานนี้ `npx next build` เขียนทับ `.next` ที่ `next start -p 9104` ตัวเก่าใช้อยู่ → ตัวนั้นควร restart ก่อนใช้ต่อ
- `npm install` ครั้งนี้รัน `prisma generate` ไม่สำเร็จ (EPERM: dev server 9102 ล็อกไฟล์ query engine) — client ที่ generate ไว้เดิมยังอยู่ครบ ไม่กระทบ

### Codex (cross_review) — diff รวม ~470k ตัวอักษร เกินเพดาน 60k ของสคริปต์ จึงตรวจทีละก้อน 10 ก้อน
ทำโดยตั้ง working tree = HEAD + ก้อน 1..k แล้วรัน `python scripts/cross_review.py` ทีละก้อน (baseline ขยับเมื่อผ่าน) จัดก้อนให้ทุกสภาพ compile ได้ (ลบ CSS module ที่ใช้ร่วมหลังแปลงทุกหน้าที่ใช้แล้ว); ก้อนสุดท้ายตรงกับไฟล์สุดท้ายทุกไบต์
1. infra + login + header/footer + PRD — รอบแรก CHANGES_REQUESTED: `tests/bootstrap-ui.test.mjs` จะล้มถ้ายังลบ CSS module ไม่ครบ (ถูก เพราะก้อนนี้ยังไม่ลบ) → ย้ายเทสต์ไปก้อนสุดท้าย → APPROVED
2. รายงาน A (ทั้งหมด, ค้นหาฎีกา/เช็ค, ส่งกรุงไทยฎีกา) — APPROVED
3. รายงาน B (ktbcheque, bydate, taxdept, taxdept/group, summarydeegar รายฎีกา) — APPROVED
4. รายงาน C (summarydeegar, taxtitle, taxtmonth) — APPROVED
5. payvouchers, charts, cheques, cpays — APPROVED
6. stations + ลบ cheques css, regisdeegars — APPROVED
7. deegars + officers/[cid]/salaries + ลบ deegars css — APPROVED
8. officers, tools/users — รอบแรก CHANGES_REQUESTED: ปุ่ม `btn-close` ใน modal ผู้ใช้ไม่มีชื่อสำหรับ screen reader (เดิมมีตัวอักษร ×) → เพิ่ม `aria-label="ปิด"` (ปุ่มปิดอื่นทุกตัวมี `aria-label="Close"` อยู่แล้ว) → APPROVED
9. useronline, import-paydirect, officers/[cid]/*, payperson — APPROVED
10. ลบ officers css, สลิป [payid], /paydirect, /salaries/[cid], TASK_BOARD, เทสต์ bootstrap-ui — APPROVED

หลังแก้ (output จริง, รันหลังไฟล์กลับเป็นสภาพสุดท้าย)
```
$ npx tsc --noEmit -p .
tsc exit 0

$ npm test
✔ checker rejects handler exports it cannot inspect (1.5449ms)
✔ non-public routes only declare handlers as export async function (4.2989ms)
✔ checker flags an unguarded handler next to a guarded one (0.5071ms)
✔ every handler of every non-public API route checks role or ownership before DB access (4.5161ms)
✔ PUBLIC list has no stale entries (0.4891ms)
✔ verifySession is always awaited (3.6464ms)
✔ user management and login log are admin-only (0.765ms)
✔ password column is never selected back to the browser (0.9617ms)
✔ thaiid-login bypass route does not exist (13.6921ms)
✔ only approved routes issue a session cookie (37.6149ms)
✔ missing or blank secret is rejected (2.2932ms)
✔ the old hardcoded fallback is rejected even if set explicitly (0.1899ms)
✔ secrets shorter than 32 bytes are rejected (0.2836ms)
✔ a random 32-byte hex secret is accepted and encoded as UTF-8 bytes (0.7078ms)
✔ error message never echoes the secret value (0.4755ms)
✔ auth.ts has no fallback and validates the key before any auth path (1.5769ms)
✔ NextAuth config is lazy and validates AUTH_SECRET first (1.5796ms)
✔ package copy of authSecret.ts matches the app (1.2918ms)
✔ bootstrap is a dependency and its CSS is imported in the root layout before globals.css (2.0696ms)
✔ only the chart bars and the printable A4 slip keep a CSS module (0.9821ms)
✔ Bootstrap JS is not loaded (React state drives navbar/dropdown/modal) (28.424ms)
✔ PasswordInput uses a Bootstrap input-group with the eye button (0.826ms)
✔ header hides the menu for status user exactly as before (0.9036ms)
✔ every useronline INSERT hard-codes NULL for password (1.591ms)
✔ login audit no longer carries the password at all (1.2898ms)
✔ no other code writes to useronline (43.1144ms)
✔ login log API and page do not expose a password field (0.5547ms)
✔ starts hidden: type is password until the eye is clicked (0.7615ms)
✔ eye button never submits the form (0.1602ms)
✔ form submit and reset hide the password again (0.1682ms)
✔ concealKey change hides the password (0.2022ms)
✔ login form uses PasswordInput inside a <form> (submit listener applies) (0.9073ms)
✔ user form (no <form>) bumps concealKey on every save attempt (0.3815ms)
✔ limited user: only own CID (0.8135ms)
✔ ordinary users and unknown statuses are limited at every accessLevel (fail closed) (0.6733ms)
✔ admin/manager are ADMIN, editor is EDITOR, whatever the accessLevel (1.2123ms)
✔ no role check anywhere grants access from accessLevel (1.3789ms)
✔ limited user without a CID in session gets nothing (0.1401ms)
✔ staff roles keep access to any CID (0.1304ms)
✔ no session or empty target CID is denied (0.0878ms)
✔ per-officer routes check CID ownership (0.6763ms)
✔ bigintToJson keeps exact values (0.9819ms)
✔ paydirect report serializes ID through bigintToJson (0.6083ms)
✔ latest-salary/regisdeegar joins go through keyJoin with a runtime data check (1.5887ms)
✔ keyJoin: fast form only when keys are trimmed, otherwise the original TRIM-both-sides form (1.7222ms)
✔ every writer of salary/regisdeegar trims PNUMBER (and NODEEGAR) before saving (0.6564ms)
✔ index script only checks data (no writes) and creates the report indexes (1.1311ms)
✔ tax reports default to the latest numeric year (junk YEARTHAI='YEAR' row) (0.4825ms)
﹣ old vs new join give the same matches for whitespace variants (live DB, temporary tables) (2049.48ms) # database not reachable
✔ pickPeriodsForPage picks exactly the periods covering the page (0.2733ms)
﹣ reports/all: new per-period paging returns the same rows as the old global sort (live DB) (2017.0889ms) # database not reachable
✔ count queries started early always have a rejection handler (0.5511ms)
✔ reports/all runs totals in parallel with the per-period counts (0.1803ms)
ℹ tests 53
ℹ suites 0
ℹ pass 51
ℹ fail 0
ℹ cancelled 0
ℹ skipped 2
ℹ todo 0
ℹ duration_ms 4229.1987
npm test exit 0
```
2 เทสต์ที่ข้าม (`﹣`) ต่อ DB local จริง — ข้ามเพราะ Docker/DB ปิด ("database not reachable") ไม่เกี่ยวกับงานนี้ (เป็นเทสต์ query รายงานของงาน #10)

### ตรวจซ้ำกับข้อมูลจริง (DB local เปิดแล้ว, `next start -p 9104` build ใหม่, 127.0.0.1 + JWT ทดสอบ status admin)
หน้าที่ดู (จอกว้าง): officers, deegars, regisdeegars, reports (ทั้งหมด), summarydeegar + รายฎีกา, taxdept, taxtmonth (ปี 2568 ทุกหน่วย — ตาราง 14 คอลัมน์เลื่อนแนวนอนในกรอบการ์ด), payvouchers, tools/users, tools/useronline, charts/inout, officers/[cid]/salaries, personal, สลิปรายเดือน payperson, สลิปจ่ายตรง A4 `/officers/paydirect/[payid]`
มือถือ 375px: officers (ตารางเลื่อนในกรอบ, ปุ่มเลขหน้าขึ้นบรรทัดใหม่), สลิปรายเดือน, สลิป A4 (`scrollWidth − innerWidth = 0`)

พบและแก้ (สาเหตุ: CSS module เดิมบางหน้าใช้ชื่อ class เดียวกันแต่ความหมายต่างกัน หรือได้สไตล์จาก selector แบบกลุ่ม ซึ่งตารางแปลงชุดเดียวไม่ครอบคลุม — ไล่เทียบนิยามทุกชื่อที่ซ้ำกันข้ามไฟล์แล้ว ที่เหลือต่างแค่ขนาดตัวอักษร/padding)
1. รายชื่อเจ้าหน้าที่: ปุ่ม "รายการรับ-จ่ายเงิน/ส่วนบุคคล/จ่ายตรง" ตัดเป็น 2–3 บรรทัด แถวสูงมาก → `btn btn-sm btn-primary text-nowrap`
2. สลิปรายเดือน: แถว "รวมรับ/รวมจ่าย/คงเหลือ" ตัวเลขชิดข้อความ ไม่มี padding (เดิมได้ layout จาก `.paypersonRow, .paypersonRowTotal, .paypersonRowBalance {…}`) → `list-group-item … d-flex justify-content-between`, คงเหลือใช้ `list-group-item-info`
3. แถบล่างของ bydate, taxdept, taxtitle, summarydeegar, summarydeegar รายฎีกา: `metaRow` ในหน้าพวกนี้คือแถบสรุปยอด/เลขหน้า (ไม่ใช่แถวป้าย-ค่าของสลิป) → `d-flex justify-content-between … border-top bg-light`
4. หัวข้อ `<h1>` ของ summarydeegar รายฎีกา และ taxdept/group ใหญ่เกิน (เดิม `title` ใส่ที่ h1 เอง) → `h5 fw-bold mb-0`; error ของ taxdept/group แสดงเป็นตัวอักษรเทา → `alert alert-danger`

ไม่ใช่ผลจากงานนี้ (พฤติกรรมเดิม): taxtmonth/payvouchers ต้องกรอกปีหรือเงื่อนไขก่อนจึงจะค้น ("2569" เป็นแค่ placeholder); ป้ายตัวเลขบนกราฟ inout ทับกันเมื่อยอดยาว (CSS แท่งกราฟคงเดิม)
ยังไม่ได้ตรวจ: สั่งพิมพ์จริง (Ctrl+P) ของสลิป A4 — browser pane สั่ง print preview ไม่ได้

หลังแก้: `npx tsc --noEmit` exit 0, `next build` ✓ Compiled successfully (68/68)
```
$ npm test
ℹ tests 53
ℹ pass 53
ℹ fail 0
ℹ skipped 0
npm test exit 0
```
(DB เปิดแล้ว เทสต์ที่ต่อ DB 2 ตัวจึงรันด้วย)

## หลักฐาน: งาน #12 — แบ่งหน้ามาตรฐานทุกหน้า + เลือก 5/10/15/50/100 ต่อหน้า

### สิ่งที่เปลี่ยน
- ใหม่ `src/lib/pagination.ts`: `PAGE_SIZE_OPTIONS` [5,10,15,50,100], `MAX_PAGE_SIZE` 100, `clampPageSize()`, `pageItems()` (หน้าแรก/สุดท้าย + ปัจจุบัน ±2 + …), `pageRange()`
- ใหม่ `src/components/Pagination.tsx`: Bootstrap `.pagination` (« ‹ เลขหน้า … › »), "แสดง [n] รายการต่อหน้า · รายการที่ a–b จาก N", disabled ระหว่างโหลด, « » ซ่อนบนจอ < 576px; `useReloadOnPageSizeChange()` โหลดหน้า 1 ใหม่เมื่อเปลี่ยนจำนวนต่อหน้า (เทียบค่าก่อนหน้า จึงไม่โหลดซ้ำตอน mount)
- 25 หน้าใช้ `<Pagination>` แทนปุ่มเลขหน้าที่เขียนเองทุกหน้า (เดิม 5–10 ปุ่ม, หน้า officers แสดงได้แค่ 10 หน้าแรก)
- API 12 ตัวที่ตัด pageSize ที่ 50 → `clampPageSize(…, 10)` เพดาน 100: cheques, cpays, deegars, officers, officers/[cid]/{paydirect,personal,salaries}, regisdeegars, reports/all, salaries/deegars, stations, users; เพดานที่สูงกว่าเดิมคงไว้
- หน้าที่เดิม "ไปหน้าถัดไปไม่ได้": ส่งกรุงไทย (ฎีกา/เช็ค), สรุปภาษี (กลุ่ม) — เพิ่มตัวแบ่งหน้า; หนังสือรับรองภาษีรายกลุ่ม — เดิมไม่ส่ง pageSize ได้แค่ 10 แถวแรก
- ค้นหาฎีกา/ค้นหาเช็ค: แบ่งหน้า + API ส่ง `totals` = ยอดรวมทั้งผลค้นหา (SUM ใน query นับจำนวนเดิม ไม่เพิ่ม query); `/api/salaries/cheques` รองรับ `page` (เดิมคืน page 1 เสมอ) ผู้เรียกที่ไม่ส่ง pageSize ยังได้ 1000 แถวเหมือนเดิม; เลขลำดับในตารางนับต่อเนื่องข้ามหน้า
- ค่าเริ่มต้นต่อหน้า: เดิม 10 → 10, เดิม 50 → 50, useronline 20 → 15, taxtitle 90 → 100, ค้นหาฎีกา/เช็ค → 50
- เทสต์ใหม่ `tests/pagination.test.mjs`: ตัวเลือก/เพดาน, clampPageSize (ค่าขยะ/ติดลบ/เกิน/ทศนิยม), pageItems (ต้น/กลาง/ท้าย/gap หน้าเดียว/หน้าเกินช่วง), pageRange, ทุกหน้าที่มี totalPages ต้องใช้ `<Pagination>` และไม่มี `pageWindow`, ไม่มี API ไหนเหลือ `Math.min(50,`

### เทสต์ (output จริง)
```
$ npx tsc --noEmit -p .
tsc exit 0

$ npm test
✔ checker rejects handler exports it cannot inspect (1.7013ms)
✔ non-public routes only declare handlers as export async function (4.5836ms)
✔ checker flags an unguarded handler next to a guarded one (0.5311ms)
✔ every handler of every non-public API route checks role or ownership before DB access (3.8066ms)
✔ PUBLIC list has no stale entries (0.4281ms)
✔ verifySession is always awaited (3.517ms)
✔ user management and login log are admin-only (0.6307ms)
✔ password column is never selected back to the browser (0.8806ms)
✔ thaiid-login bypass route does not exist (12.4039ms)
✔ only approved routes issue a session cookie (19.3822ms)
✔ missing or blank secret is rejected (1.8537ms)
✔ the old hardcoded fallback is rejected even if set explicitly (0.2704ms)
✔ secrets shorter than 32 bytes are rejected (0.2921ms)
✔ a random 32-byte hex secret is accepted and encoded as UTF-8 bytes (1.0045ms)
✔ error message never echoes the secret value (0.3311ms)
✔ auth.ts has no fallback and validates the key before any auth path (2.0362ms)
✔ NextAuth config is lazy and validates AUTH_SECRET first (1.6473ms)
✔ package copy of authSecret.ts matches the app (1.3996ms)
✔ bootstrap is a dependency and its CSS is imported in the root layout before globals.css (2.0134ms)
✔ only the chart bars and the printable A4 slip keep a CSS module (0.9667ms)
✔ Bootstrap JS is not loaded (React state drives navbar/dropdown/modal) (17.0629ms)
✔ PasswordInput uses a Bootstrap input-group with the eye button (0.5306ms)
✔ header hides the menu for status user exactly as before (0.5216ms)
✔ every useronline INSERT hard-codes NULL for password (1.4363ms)
✔ login audit no longer carries the password at all (1.2284ms)
✔ no other code writes to useronline (20.8648ms)
✔ login log API and page do not expose a password field (0.519ms)
✔ page size options are exactly 5/10/15/50/100 and the API cap is the largest (1.4322ms)
✔ clampPageSize keeps 1..max and falls back on junk (0.2043ms)
✔ pageItems shows first/last, current ±2 and gaps (0.2391ms)
✔ pageRange (0.1822ms)
✔ every paged list page uses the shared <Pagination> and no hand-made page buttons remain (12.8576ms)
✔ APIs that capped page size at 50 now allow MAX_PAGE_SIZE (100) (8.371ms)
✔ starts hidden: type is password until the eye is clicked (0.7977ms)
✔ eye button never submits the form (0.1632ms)
✔ form submit and reset hide the password again (0.1681ms)
✔ concealKey change hides the password (0.2011ms)
✔ login form uses PasswordInput inside a <form> (submit listener applies) (0.4604ms)
✔ user form (no <form>) bumps concealKey on every save attempt (0.5191ms)
✔ limited user: only own CID (0.9212ms)
✔ ordinary users and unknown statuses are limited at every accessLevel (fail closed) (0.6304ms)
✔ admin/manager are ADMIN, editor is EDITOR, whatever the accessLevel (0.966ms)
✔ no role check anywhere grants access from accessLevel (1.7332ms)
✔ limited user without a CID in session gets nothing (0.1571ms)
✔ staff roles keep access to any CID (0.1279ms)
✔ no session or empty target CID is denied (0.0794ms)
✔ per-officer routes check CID ownership (0.801ms)
✔ bigintToJson keeps exact values (0.9332ms)
✔ paydirect report serializes ID through bigintToJson (0.5032ms)
✔ latest-salary/regisdeegar joins go through keyJoin with a runtime data check (1.4842ms)
✔ keyJoin: fast form only when keys are trimmed, otherwise the original TRIM-both-sides form (1.5136ms)
✔ every writer of salary/regisdeegar trims PNUMBER (and NODEEGAR) before saving (1.12ms)
✔ index script only checks data (no writes) and creates the report indexes (11.8533ms)
✔ tax reports default to the latest numeric year (junk YEARTHAI='YEAR' row) (0.4258ms)
✔ old vs new join give the same matches for whitespace variants (live DB, temporary tables) (77.6549ms)
✔ pickPeriodsForPage picks exactly the periods covering the page (0.2772ms)
✔ reports/all: new per-period paging returns the same rows as the old global sort (live DB) (11992.8945ms)
✔ count queries started early always have a rejection handler (0.6883ms)
✔ reports/all runs totals in parallel with the per-period counts (0.2035ms)
ℹ tests 59
ℹ suites 0
ℹ pass 59
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12260.8639
npm test exit 0
```
eslint: 262 ปัญหา (ก่อนงาน #11 = 267) ไม่มีปัญหาใหม่ต่อไฟล์/ต่อ rule; `next build` ✓ Compiled successfully (68/68)

### ตรวจในเบราว์เซอร์ (`next start -p 9104`, DB local ข้อมูลจริง, JWT ทดสอบ admin)
- /officers: เริ่ม 10 แถว "รายการที่ 1–10 จาก 12,476" → เลือก 100 = 100 แถว (เดิม API ตัดที่ 50) → หน้าสุดท้าย = หน้า 125 มี 76 แถว "12,401–12,476" ปุ่ม › » disabled → ‹ = หน้า 124 → เลือก 5 = กลับหน้า 1, 2,496 หน้า
- เลือก 100 แล้วกดหน้าถัดไป ได้ 100 แถว "101–200" ใน: deegars, cheques, regisdeegars, stations, reports, tools/users, tools/useronline (เริ่ม 15), reports/summarydeegar; ข้อมูลน้อยกว่า 100 แสดงครบ: cpays 79, taxdept 97, taxtitle 97 (เริ่ม 100)
- หนังสือรับรองภาษีรายกลุ่ม ปี 2568: 178 แถว (เดิมเห็นแค่ 10) → 100 + หน้า 2 = 78 แถว
- officers/[cid]/paydirect (คนที่มี 128 รายการ): เลือก 5 → "1–5 จาก 128" → ถัดไป "6–10"
- ค้นหาฎีกา P680000017 (57 แถว, เดิมเห็นแค่ 50 และยอดรวมขาด): หน้า 1 = 50 แถว, หน้า 2 = 7 แถว ลำดับ 51–57, Total 268,523,947.00 ทุกหน้า = ผลรวมทั้ง 57 แถวจาก API (ตรวจด้วย fetch pageSize 100)
- ค้นหาเช็ค 31310248649 (121 แถว): `totals.money` 3,722,702.85 = ผลรวม 121 แถวจากการเรียกแบบเดิม (ไม่ส่ง pageSize → 1000)
- ส่งกรุงไทย(เช็ค) 31310248649: 50 แถว 3 หน้า → หน้าสุดท้าย "101–102 จาก 102" (เดิมไปหน้า 2 ไม่ได้)
- API ที่หน้าต้องกรอกเงื่อนไขก่อน: payvouchers page 3 size 15 = 15 แถว, bydate page 2 size 100 = 100 แถว, taxtmonth size 5 ✓
- มือถือ 375px: แถบเลขหน้าอยู่บรรทัดเดียว (สูง 31px, ไม่เลื่อนแนวนอน) ที่หน้า 3, 5, 7 ของ 4,396 หน้า — รอบแรก « » ทำให้ขึ้นบรรทัดใหม่ จึงซ่อน « » บนจอ < 576px

### Codex (diff ~117k > เพดาน 60k จึงตรวจเป็นก้อนตามแนวตั้ง: core+ค้นหา+officers / ทะเบียน+รายงาน / TASK_BOARD+เทสต์)
- รอบแรกแบ่งตามชั้น (lib+API ก่อน หน้าเว็บทีหลัง) → CHANGES_REQUESTED เพราะก้อนแรกมีโครงแต่ยังไม่มีหน้าใช้ → เปลี่ยนเป็นแบ่งตามแนวตั้ง (หน้า + API ของมันอยู่ก้อนเดียวกัน)
- ก้อน 1 รอบแรก CHANGES_REQUESTED 3 ข้อ แก้ทั้งหมด:
  1. `ORDER BY` ของ `/api/salaries/cheques` และ `/api/salaries/deegars` ไม่ unique → แบ่งหน้าด้วย OFFSET แถวอาจหาย/ซ้ำข้ามหน้า → ต่อท้าย `deegar.ID, salary.ID` / `deegar.ID, bank.id`
     ตรวจแล้ว: ดึงเช็ค 31310248649 ทีละ 5 แถวจนครบ = 121 แถว ไม่ซ้ำ และเป็นชุดเดียวกับการเรียกครั้งเดียว 1000 แถว; ฎีกา P680000017 ทีละ 5 = 57 แถวไม่ซ้ำ
  2. เปลี่ยนหน้าใช้ค่าที่พิมพ์ค้างในฟอร์ม (ยังไม่กดค้นหา) → เก็บ `appliedFilters` = ตัวกรองของการค้นหาที่สำเร็จล่าสุด ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า — แก้ทุกหน้าที่ค้นหาด้วยปุ่ม (11 หน้า: reports ทั้งหมด, bydate, ค้นหาฎีกา/เช็ค, ktb ฎีกา/เช็ค, payvouchers, summarydeegar, taxdept, taxtitle, taxtmonth); หน้าที่ค้นหาอัตโนมัติเมื่อพิมพ์ (ทะเบียน/ผู้ใช้) ตัวกรองในฟอร์มคือตัวที่ใช้อยู่แล้ว
     ตรวจแล้ว: ค้นหาฎีกา P680000017 → พิมพ์ P61 ไม่กดค้นหา → กดถัดไป = ยังเป็น P680000017 แถว 51–57; เปลี่ยนเป็น 15 ต่อหน้า = P680000017 แถว 1–15; สรุปภาษี(ฝ่าย) ค้น 2568 → พิมพ์ 2560 → ถัดไป = "11–20 จาก 178" (ชุด 2568)
  3. ค้นหาฎีกา/เช็ค ซ่อนตัวเลือกจำนวนต่อหน้าเมื่อผลเป็น 0 → แสดง `<Pagination>` ทุกครั้งที่มีผลค้นหา (component จัดการกรณี 0 แถวเอง)
- หลังแก้: `npx tsc --noEmit` exit 0, `npm test` 59 pass / 0 fail, `next build` ✓
- ก้อน 1 รอบสอง CHANGES_REQUESTED 2 ข้อ แก้ทั้งหมด:
  1. รายการรับ-จ่ายรายคน (`officers/[cid]/salaries`) เปลี่ยนจำนวนต่อหน้าใช้ `filters` ในฟอร์ม → ใช้ `appliedFilters` เหมือนหน้ารายงาน
     (หน้านี้และหน้าทะเบียน/ผู้ใช้ค้นหาอัตโนมัติหลังพิมพ์ 250ms ค่าในฟอร์มจึงเป็นค่าที่ใช้อยู่แล้วเกือบตลอด แต่แก้ให้ชัดในหน้าที่ถูกชี้)
  2. `page=Infinity` ผ่านตัวแปลงเดิมแล้วได้ OFFSET อนันต์ → `parsePage()` ใน `src/lib/pagination.ts` (จำนวนเต็มปลอดภัย ≥ 1 ไม่งั้น 1) ใช้ใน API ทั้ง 14 ตัวที่งานนี้แก้
     ตรวจแล้ว (`next start` 9104): salaries/cheques `page=Infinity` → 200 page 1, salaries/deegars `page=abc` → 200 page 1, officers `page=Infinity` → 200, users `page=-3&pageSize=100` → 200 page 1 100 แถว, cheques `page=1e400&pageSize=500` → 200 page 1 100 แถว (เพดาน), deegars `page=2&pageSize=15` → page 2 15 แถว
```
✔ parsePage gives a safe integer >= 1 (no NaN/Infinity OFFSET) (0.1592ms)
ℹ tests 60
ℹ pass 60
ℹ fail 0
ℹ skipped 0
npm test exit 0
```
- ก้อน 1 รอบสาม CHANGES_REQUESTED เพราะการแบ่งก้อน (PRD บรรยายหน้าที่อยู่ก้อนถัดไป, หลักฐานอยู่คนละก้อนกับโค้ด) → ย้าย PRD ไปก้อนที่ทำหน้าครบ และ TASK_BOARD ไปก้อนแรก; เพิ่มหลักฐานที่ถูกขอ:
  - โหลดครั้งแรกไม่ซ้ำ: เปิด /officers (production build) มี request `/api/officers?page=1&pageSize=10` ครั้งเดียว; เปลี่ยนเป็น 50 ต่อหน้า → `?page=1&pageSize=50` ครั้งเดียว (นับจาก `performance.getEntriesByType('resource')`)
  - ผลว่าง: ค้นหาฎีกา "ZZZ-NOT-EXIST" → แถว "ไม่พบข้อมูล", ตัวเลือกจำนวนต่อหน้ายังแสดง "รายการที่ 0–0 จาก 0", ไม่มีปุ่มเลขหน้า
  - เปลี่ยนจำนวนต่อหน้ากลับหน้า 1 และคงตัวกรองที่ค้นแล้ว + ยอดรวมข้ามหลายหน้า: ดูรอบแรกข้อ 2 (P680000017 → 15 ต่อหน้า = แถว 1–15 ของ P680000017) และ "ตรวจในเบราว์เซอร์" (Total 268,523,947.00 เท่ากันทั้งหน้า 1 และ 2 = ผลรวม 57 แถว)
  - ยังไม่มีเทสต์ DOM (โปรเจกต์ไม่มี jsdom/React testing library) พฤติกรรมฝั่งเบราว์เซอร์จึงตรวจด้วย browser pane ตามรายการข้างบน; ตรรกะที่แยกได้ (`pageItems`, `pageRange`, `clampPageSize`, `parsePage`) มี unit test
- ก้อน 1 รอบสี่ CHANGES_REQUESTED: หน้าเกินหน้าสุดท้าย (ข้อมูลถูกลบระหว่างเปลี่ยนหน้า) `pageRange(3, 10, 15)` แสดง "15–15" ทั้งที่ไม่มีแถว → `pageRange` คืน 0–0 เมื่อ from > total (เทสต์ใหม่) และ `<Pagination>` เรียก `onPageChange(totalPages)` เมื่อ page > totalPages (ไม่ทำระหว่างโหลด)
- ก้อน 1 รอบห้า CHANGES_REQUESTED: การแก้หน้าเกินช่วงยิงซ้ำไม่จบถ้าโหลดหน้าแก้ไม่สำเร็จ (Attack the Premise: เป็นรอบที่ 2 ของจุดนี้ จึงลดเหลือกลไกเล็กที่สุดที่ทดสอบได้) → `pageCorrection()` ใน `src/lib/pagination.ts` ลองครั้งเดียวต่อคู่ (page, totalPages) จำคู่ที่ลองแล้วใน ref; เทสต์ครอบกรณีโหลดแก้ไม่สำเร็จแล้ว disabled สลับ → ไม่ยิงซ้ำ
- ก้อน 1 รอบหก APPROVED
- ก้อน 2 รอบแรก CHANGES_REQUESTED: (1) หน้าค้นหาอัตโนมัติ (cheques, cpays, deegars, officers) เปลี่ยนจำนวนต่อหน้าใช้ `filters` ในฟอร์ม → ใช้ `appliedFilters` แบบเดียวกับหน้าอื่น ครบทั้ง 8 หน้าที่ค้นหาอัตโนมัติ (รวม regisdeegars, stations, tools/users, tools/useronline);
  (2) ผู้ตรวจไม่เห็นโค้ด `Pagination`/`clampPageSize`/`parsePage` ในก้อนนี้ — อยู่ในก้อน 1 ที่ APPROVED แล้ว (`src/components/Pagination.tsx`, `src/lib/pagination.ts`) และมี unit test ใน `tests/pagination.test.mjs`
- ก้อน 2 รอบสอง CHANGES_REQUESTED: ขอ output ของเทสต์รอบปัจจุบัน + หลักฐานว่าเปลี่ยนจำนวนต่อหน้าแล้วกลับหน้า 1 และคงตัวกรอง → แนบด้านล่าง (รันบนสภาพไฟล์สุดท้ายหลังแก้ appliedFilters ทั้ง 8 หน้า และเปลี่ยนชื่อ component `KtbDeegarPage`)

#### เทสต์รอบปัจจุบัน (output จริง)
```
$ npx tsc --noEmit -p .
tsc exit 0

$ npm test
✔ checker rejects handler exports it cannot inspect (1.4469ms)
✔ non-public routes only declare handlers as export async function (5.2454ms)
✔ checker flags an unguarded handler next to a guarded one (0.5517ms)
✔ every handler of every non-public API route checks role or ownership before DB access (4.1996ms)
✔ PUBLIC list has no stale entries (0.3922ms)
✔ verifySession is always awaited (3.6354ms)
✔ user management and login log are admin-only (0.6152ms)
✔ password column is never selected back to the browser (0.8636ms)
✔ thaiid-login bypass route does not exist (17.0194ms)
✔ only approved routes issue a session cookie (18.3527ms)
✔ missing or blank secret is rejected (0.9956ms)
✔ the old hardcoded fallback is rejected even if set explicitly (0.155ms)
✔ secrets shorter than 32 bytes are rejected (0.1783ms)
✔ a random 32-byte hex secret is accepted and encoded as UTF-8 bytes (0.6233ms)
✔ error message never echoes the secret value (0.2435ms)
✔ auth.ts has no fallback and validates the key before any auth path (2.1335ms)
✔ NextAuth config is lazy and validates AUTH_SECRET first (1.2293ms)
✔ package copy of authSecret.ts matches the app (1.8747ms)
✔ bootstrap is a dependency and its CSS is imported in the root layout before globals.css (1.126ms)
✔ only the chart bars and the printable A4 slip keep a CSS module (0.6634ms)
✔ Bootstrap JS is not loaded (React state drives navbar/dropdown/modal) (9.7149ms)
✔ PasswordInput uses a Bootstrap input-group with the eye button (0.308ms)
✔ header hides the menu for status user exactly as before (0.2848ms)
✔ every useronline INSERT hard-codes NULL for password (1.5128ms)
✔ login audit no longer carries the password at all (1.0635ms)
✔ no other code writes to useronline (19.2553ms)
✔ login log API and page do not expose a password field (0.5592ms)
✔ page size options are exactly 5/10/15/50/100 and the API cap is the largest (1.0183ms)
✔ clampPageSize keeps 1..max and falls back on junk (0.137ms)
✔ parsePage gives a safe integer >= 1 (no NaN/Infinity OFFSET) (0.1351ms)
✔ pageItems shows first/last, current ±2 and gaps (0.1988ms)
✔ pageRange (0.1657ms)
✔ pageCorrection jumps to the last page once and never loops on a failed fetch (0.1202ms)
✔ every paged list page uses the shared <Pagination> and no hand-made page buttons remain (12.5566ms)
✔ APIs that capped page size at 50 now allow MAX_PAGE_SIZE (100) (9.5319ms)
✔ starts hidden: type is password until the eye is clicked (0.7396ms)
✔ eye button never submits the form (0.1489ms)
✔ form submit and reset hide the password again (0.1638ms)
✔ concealKey change hides the password (0.187ms)
✔ login form uses PasswordInput inside a <form> (submit listener applies) (0.3808ms)
✔ user form (no <form>) bumps concealKey on every save attempt (0.3515ms)
✔ limited user: only own CID (0.6829ms)
✔ ordinary users and unknown statuses are limited at every accessLevel (fail closed) (0.574ms)
✔ admin/manager are ADMIN, editor is EDITOR, whatever the accessLevel (0.8524ms)
✔ no role check anywhere grants access from accessLevel (1.0529ms)
✔ limited user without a CID in session gets nothing (0.1174ms)
✔ staff roles keep access to any CID (0.0991ms)
✔ no session or empty target CID is denied (0.0611ms)
✔ per-officer routes check CID ownership (0.5522ms)
✔ bigintToJson keeps exact values (0.7096ms)
✔ paydirect report serializes ID through bigintToJson (0.4677ms)
✔ latest-salary/regisdeegar joins go through keyJoin with a runtime data check (1.3205ms)
✔ keyJoin: fast form only when keys are trimmed, otherwise the original TRIM-both-sides form (1.4875ms)
✔ every writer of salary/regisdeegar trims PNUMBER (and NODEEGAR) before saving (0.675ms)
✔ index script only checks data (no writes) and creates the report indexes (0.4154ms)
✔ tax reports default to the latest numeric year (junk YEARTHAI='YEAR' row) (0.4438ms)
✔ old vs new join give the same matches for whitespace variants (live DB, temporary tables) (57.6841ms)
✔ pickPeriodsForPage picks exactly the periods covering the page (0.3483ms)
✔ reports/all: new per-period paging returns the same rows as the old global sort (live DB) (11798.8447ms)
✔ count queries started early always have a rejection handler (0.7486ms)
✔ reports/all runs totals in parallel with the per-period counts (0.2607ms)
ℹ tests 61
ℹ suites 0
ℹ pass 61
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12012.9107
npm test exit 0
```
eslint ทั้ง `src`: 255 ปัญหา (ก่อนงาน #11 = 267) ไม่มีปัญหาใหม่ต่อไฟล์/ต่อ rule — `react-hooks/rules-of-hooks` 9 ข้อใน ktbdeegar หายเพราะชื่อ component เดิมขึ้นต้นตัวเล็ก (`ktbdeegarPage`) แก้เป็น `KtbDeegarPage`
`npx next build`: ✓ Compiled successfully, ✓ Generating static pages (68/68)

#### หน้าทะเบียนเช็ค (ค้นหาอัตโนมัติ) หลังแก้ appliedFilters — `next start -p 9104` ข้อมูลจริง
| ขั้น | ผล |
|------|----|
| เปิดหน้า | รายการที่ 1–10 จาก 24,638 |
| พิมพ์ตัวกรองเลขเช็ค `3131` (รอ 250ms ค้นหาเอง) | รายการที่ 1–10 จาก 8,920 |
| เลือก 100 ต่อหน้า | รายการที่ 1–100 จาก 8,920, 100 แถว (กลับหน้า 1, ตัวกรองคงอยู่) |
| กดหน้าถัดไป | รายการที่ 101–200 จาก 8,920, 100 แถว, แถวแรก 31310072270 (ยังเป็นผลกรอง 3131) |
หน้าค้นหาด้วยปุ่ม (ทดสอบไว้ข้างบน): ค้นหาฎีกา P680000017 → พิมพ์ P61 ไม่กดค้นหา → เลือก 15 ต่อหน้า = รายการที่ 1–15 ของ P680000017; สรุปภาษี(ฝ่าย) ค้น 2568 → พิมพ์ 2560 → ถัดไป = 11–20 จาก 178 (ชุด 2568)
- ก้อน 2 รอบสาม APPROVED
- ก้อน 3 รอบแรก CHANGES_REQUESTED: ค่าเริ่มต้น useronline 20 → 15 ไม่มีคำอธิบาย → ใส่คอมเมนต์ที่ตัวแปร: 20 ไม่อยู่ใน `PAGE_SIZE_OPTIONS` select จึงแสดงไม่ได้ ใช้ตัวเลือกที่ใกล้ที่สุดตาม PRD 11.1 (ทำแบบเดียวกันที่ taxtitle 90 → 100)
- ก้อน 3 รอบสอง CHANGES_REQUESTED: ขอหลักฐานของหน้าในก้อนนี้ (stations, tools/users, tools/useronline, reports ทั้งหมด, bydate, ส่งกรุงไทย) ครบทุกจำนวนต่อหน้า + คงตัวกรอง + เพดาน API → แนบด้านล่าง

#### หลักฐานหน้าในก้อน 3 (`next start -p 9104`, ข้อมูลจริง, สภาพไฟล์สุดท้าย)
เลือกจำนวนต่อหน้าทีละค่า แล้วกดหน้าถัดไป (จำนวนแถวในตาราง / ข้อความช่วงรายการ):
| หน้า | เริ่ม | 5 | 10 | 15 | 50 | 100 | ถัดไป |
|------|------|---|----|----|----|-----|-------|
| /stations | 10: 1–10 จาก 254 | 5 | 10 | 15 | 50 | 100 | 100: 101–200 |
| /tools/users | 10: 1–10 จาก 12,140 | 5 | 10 | 15 | 50 | 100 | 100: 101–200 |
| /tools/useronline | 15: 1–15 จาก 34,488 | 5 | 10 | 15 | 50 | 100 | 100: 101–200 |
| /reports (ทั้งหมด) | 10: 1–10 จาก 111,215 | 5 | 10 | 15 | 50 | 100 | 100: 101–200 |
(ทุกค่าจำนวนแถวตรงกับที่เลือก และช่วงรายการเริ่มที่ 1 หลังเปลี่ยนจำนวนต่อหน้า)

คงตัวกรองที่ค้นแล้ว: /reports ค้นปี 2560 → "1–10 จาก 5,393" → พิมพ์ 2568 ไม่กดค้นหา → เลือก 15 = "1–15 จาก 5,393" ปีในตารางยังเป็น 2560 → ถัดไป "16–30 จาก 5,393" ปี 2560

API (หน้าต้องกรอกเงื่อนไขก่อน) page=2 กับทุกจำนวนต่อหน้า:
- `/api/reports/bydate?startdate=2025-01-01&enddate=2025-12-31`: 5→5 แถว (2,119 หน้า), 10→10 (1,060), 15→15 (707), 50→50 (212), 100→100 (106)
- `/api/reports/ktbcheque?cheque=31310248649` (102 แถว): 5→5 (21 หน้า), 10→10 (11), 15→15 (7), 50→50 (3), 100→2 แถว (หน้า 2 ของ 2)
- `/api/reports/ktbdeegar?pnumber=P680000017&nodeegar=1` size 5 → 5 แถว จาก 47 (10 หน้า)
เพดาน API: stations / users / useronline / reports/all — `pageSize=100` → 100 แถว, `pageSize=500` → ตัดเหลือ 100, `page=Infinity` → 200 page 1 (useronline ไม่ได้แก้ในงานนี้ ตอบ `page: null` แต่ได้หน้าแรก — บันทึกไว้เป็นงานต่อ)

```
$ npx tsc --noEmit -p .
tsc exit 0

$ npm test
✔ login log API and page do not expose a password field (0.9396ms)
(node:31984) [MODULE_TYPELESS_PACKAGE_JSON] Warning: Module type of file:///C:/fullstack/paymonth-nextjs/src/lib/pagination.ts is not specified and it doesn't parse as CommonJS.
✔ page size options are exactly 5/10/15/50/100 and the API cap is the largest (1.1102ms)
✔ pageItems shows first/last, current ±2 and gaps (0.1973ms)
✔ pageRange (0.1671ms)
✔ pageCorrection jumps to the last page once and never loops on a failed fetch (0.1291ms)
✔ every paged list page uses the shared <Pagination> and no hand-made page buttons remain (30.4481ms)
✔ APIs that capped page size at 50 now allow MAX_PAGE_SIZE (100) (23.207ms)
✔ pickPeriodsForPage picks exactly the periods covering the page (0.2942ms)
ℹ tests 61
ℹ pass 61
ℹ fail 0
ℹ skipped 0
npm test exit 0
```

## หลักฐาน: งาน #13 — ตัวเลขจำนวนเงินชิดขวาทุกหน้า

### สิ่งที่เปลี่ยน
- 77 ช่อง (`td`/`th`) ใน 19 หน้า ที่แสดงจำนวนเงินแต่จัดกลาง (`text-center`) หรือชิดซ้าย (ไม่มี class) → `text-end text-nowrap`:
  deegars 3, regisdeegars 6, reports (ทั้งหมด + modal) 4, bydate 1, ktbcheque 1, ktbdeegar 1, payvouchers 1, summarydeegar 3, summarydeegar รายฎีกา 3, taxdept 2, taxdept/group 3, taxtitle 7, taxtmonth 26 (13 คอลัมน์ + แถวรวม 13), officers/paydirect 3, officers/[cid]/{paydirect,payperson,personal} 3+3+3, /paydirect 1, /salaries/[cid] 3
- ไม่แตะหัวคอลัมน์ ข้อความ หรือการจัดรูปแบบตัวเลข
- เทสต์ใหม่ใน `tests/bootstrap-ui.test.mjs`: ทุก `td`/`th` ที่ขึ้นต้นด้วย formatMoney/formatNumber/formatBaht/toLocaleString ต้องมี `text-end` (พบ ≥ 77 ช่อง)

### เทสต์ (output จริง)
```
$ npx tsc --noEmit -p .
tsc exit 0

$ npm test
✔ money cells are right-aligned on every page (text-end) (4.5708ms)
ℹ tests 62
ℹ pass 62
ℹ fail 0
ℹ skipped 0
npm test exit 0
```
`next build` ✓ Compiled successfully (68/68)

### ตรวจในเบราว์เซอร์ (`next start -p 9104`, ข้อมูลจริง) — นับช่องที่ข้อความเป็นจำนวนเงิน `1,234.56` แล้วดู `getComputedStyle().textAlign`
| หน้า | ช่องจำนวนเงิน | ไม่ชิดขวา |
|------|------|------|
| /deegars | 10 | 0 |
| /regisdeegars | 30 | 0 |
| /reports | 20 | 0 |
| /reports/summarydeegar (ภาพที่ผู้ใช้ส่งมา) | 30 | 0 |
| /reports/taxdept | 20 | 0 |
| /reports/taxtitle | 679 | 0 |
| /reports/taxdept/group?yearthai=2568 | 30 | 0 |
| /officers/[cid]/salaries, personal, payperson | 3, 9, 9 | 0 |
| /officers/paydirect/[payid] (สลิป A4) | 23 | 0 |
/officers/[cid]/paydirect แถวแรก: เดือน/ปี ชิดซ้าย, 33,990.00 / 17,193.72 / 16,796.28 ชิดขวา; /deegars ภาษี/ค่าปรับ (แสดง "0") และ Money ชิดขวา

## หลักฐาน: งาน #14 — ประวัติจ่ายตรงรายคนช้า

### สมมติฐาน → ตรวจ (ก่อนแก้)
หน้า `/officers/[cid]/paydirect` ได้ HTML เร็ว แต่รอข้อมูลจาก `GET /api/officers/[cid]/paydirect`; สงสัยว่า query ค้น `paydirect` ด้วย CID ใช้ index ไม่ได้
- ตาราง `paydirect` 564,977 แถว, index: `PRIMARY (ID)`, `key (A, B, C)` เท่านั้น; CID ที่ผู้ใช้แจ้งว่าช้า มี 145 แถว
- EXPLAIN query รายการ (ก่อน): `paydirect type=index key=key rows=564977 Using where; Using index` → อ่านทั้ง index ทุกครั้ง และ query นับจำนวนก็เหมือนกัน
- เวลาจริง (`next start -p 9104`, DB local, fetch 5 ครั้ง): **390, 439, 438, 438, 431 ms**; เปิดทั้งหน้า: TTFB 9 ms, API 493 ms → เวลารอเกือบทั้งหมดอยู่ที่ query นี้

### แก้
- `prisma/sql/2026-11-25_paydirect_cid_index.sql`: `CREATE INDEX IF NOT EXISTS idx_paydirect_cid ON paydirect (C, A, B)` (ไม่แก้ข้อมูล รันซ้ำได้) — สร้างบน DB local ใช้ 2.8 วินาที
- `prisma/schema.prisma`: `@@index([C, A, B], map: "idx_paydirect_cid")`
- ไม่แก้ query/API/หน้าเว็บ — ผลลัพธ์เหมือนเดิม
- เทสต์ `tests/paydirect-index.test.mjs`: script สร้าง index (C, A, B) อย่างเดียว ไม่มีคำสั่งแก้ข้อมูล, schema ประกาศ index เดียวกัน, API ยังกรองด้วย `paydirect.C`

### หลังแก้ (วัดแบบเดิม)
- EXPLAIN: `paydirect type=ref key=idx_paydirect_cid rows=121 Using where; Using index` (ทั้ง query รายการและนับจำนวน)
- เวลา API 5 ครั้ง: **17, 9, 8, 9, 8 ms** (เดิม ~430 ms); total 145 / 10 แถว เท่าเดิม; page 3 size 50 = 45 แถว 9 ms; อีกคน (128 รายการ) 9 ms
- เปิดทั้งหน้า: TTFB 10 ms, ข้อมูลมาครบที่ 34 ms (เดิม ~520 ms) — ตาราง 10 แถว "รายการที่ 1–10 จาก 145"

```
$ npx tsc --noEmit -p .
tsc exit 0

$ npm test
✔ SQL script only adds idx_paydirect_cid (C, A, B), re-runnable, no data changes (1.1639ms)
✔ per-person paydirect API filters by paydirect.C (the column the index starts with) (0.2889ms)
✔ paydirect report serializes ID through bigintToJson (0.4503ms)
ℹ tests 65
ℹ pass 65
ℹ fail 0
ℹ skipped 0
npm test exit 0
```

### สิ่งที่คนต้องทำ
- **รัน `prisma/sql/2026-11-25_paydirect_cid_index.sql` บน DB ของ server** (ช่วงไม่มีคนนำเข้าข้อมูลจ่ายตรง เพราะ MyISAM ล็อกตารางระหว่างสร้าง index) — ถ้าไม่รัน หน้าบน server ยังช้าเหมือนเดิม

## หลักฐาน: งาน #15 — คู่มือ deploy (`docs/DEPLOY.md`)

### ตรวจข้อเท็จจริงในคู่มือกับ repo (output จริง)
```
$ grep -n "working-directory\|pm2 \|npm ci\|prisma generate\|npm run build" .github/workflows/deploy.yml (ตัดบรรทัดซ้ำ)
17:        working-directory: /home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th
36:          npm ci
41:          npx prisma generate
46:          npm run build
53:            pm2 restart paymonth-nextjs
$ grep -n "\"start\"" package.json
10:    "start": "next start -p 9102",
$ grep -n "name:" ecosystem.config.js
4:      name: 'paymonth-nextjs',
$ grep -n "MIN_SECRET_BYTES =" src/lib/authSecret.ts
6:export const MIN_SECRET_BYTES = 32;
$ ls prisma/sql
2026-11-23_clear_useronline_passwords.sql
2026-11-24_report_indexes.sql
2026-11-25_paydirect_cid_index.sql
$ grep -c "CREATE INDEX IF NOT EXISTS" prisma/sql/2026-11-24_report_indexes.sql
5
$ grep -n "cleanDistDir" node_modules/next/dist/build/index.js
477:            if (config.cleanDistDir && !isGenerateMode) {
$ gh run view 45351428238 --log-failed | grep "overwritten" -A9 (สรุป)
error: Your local changes to the following files would be overwritten by merge:
	src/app/(dashboard)/reports/deegars/page.tsx
	src/app/(dashboard)/reports/payvouchers/page.module.css
	src/app/(dashboard)/reports/payvouchers/page.tsx
	src/app/(dashboard)/reports/summarydeegar/[pnumber]/[nodeegar]/page.tsx
	src/app/api/deegars/route.ts
	src/app/api/reports/ktbcheque/export/route.ts
	src/app/api/reports/ktbdeegar/export/route.ts
	src/app/api/salaries/deegars/route.ts
Please commit your changes or stash them before you merge.
$ bash -n (ทุกบล็อกคำสั่งใน DEPLOY.md)
syntax OK
```

### ทดลองคำสั่งสำรอง DB (ขั้น 1.2–1.3) กับ DB local (MariaDB 10.11.18 รุ่นเดียวกับ server, ใน container, ลบไฟล์ dump ทันทีหลังตรวจ เพราะมีข้อมูลบุคคลจริง)
คำสั่ง: `umask 077; set -o pipefail; mkdir -m 700; mariadb-dump --lock-all-tables --routines test-paymonth | gzip > db.sql.gz && echo "DUMP OK" || echo "DUMP FAILED"; gzip -t; zcat | tail -n 1; ls -l` และทดสอบกรณีล้มด้วยชื่อ DB ผิด
```
DUMP OK
gzip OK
-- Dump completed on 2026-11-24  7:57:04
drwx------ 2 root root 4096 Nov 24 07:56 /tmp/bk
total 56684
-rw------- 1 root root 58043315 Nov 24 07:57 db.sql.gz
--- negative test (wrong DB name):
DUMP FAILED — หยุด
ls: cannot access '/tmp/bk': No such file or directory
```
- กรณีปกติ: DUMP OK, gzip OK, บรรทัดสุดท้าย `-- Dump completed`, โฟลเดอร์ `drwx------` ไฟล์ `-rw-------`
- กรณี mysqldump ล้ม: `pipefail` ทำให้ขึ้น "DUMP FAILED — หยุด" (ไม่มี pipefail จะขึ้น OK เพราะ gzip สำเร็จ)

### Codex รอบ 1 (CHANGES_REQUESTED) — แก้แล้ว
- `--single-transaction` ไม่ได้ snapshot ที่สอดคล้องกันกับตาราง MyISAM → ใช้ `--lock-all-tables` และให้ทำในช่วงปิดปรับปรุง
- `mysqldump | gzip` รายงานสำเร็จแม้ dump ล้ม → `set -o pipefail` + `&& echo DUMP OK || echo DUMP FAILED` + ตรวจ `gzip -t` และบรรทัด `-- Dump completed`
- ไฟล์สำรองอาจอ่านได้โดยผู้ใช้อื่นบน server → `umask 077` และ `mkdir -m 700`
- งาน #15 ไม่มีหลักฐาน → แนบข้างบน; สถานะระบุว่ายังไม่ได้ทดลองบน server จริง

### Codex รอบ 2 (CHANGES_REQUESTED) — แก้แล้ว
- deploy/ย้อนกลับทำต่อแม้ขั้นก่อนหน้าล้ม (pull ล้มแล้วยัง build, build ล้มแล้วยัง restart) → ต่อทุกขั้นด้วย `&&` จบด้วย `echo DEPLOY OK || echo DEPLOY FAILED`; pull ใช้ `--ff-only`
- สำรองด้วย `git diff` ไม่รวมไฟล์ที่ staged และ `git checkout -- .` ไม่คืนไฟล์ที่ staged → สำรองด้วย `git diff HEAD`, คืนด้วย `git reset --hard HEAD` หลังตรวจว่ามี patch สำรองแล้ว (`test -s`)
- ตรวจไวยากรณ์ใหม่ทุกบล็อก: `bash -n` → syntax OK
- ทดลองใน git repo ชั่วคราว: แก้ไฟล์ f (ไม่ staged) + g (staged) → `git diff HEAD` มีทั้ง 2 บรรทัดที่เพิ่ม (`grep -c "^+[xy]"` = 2); `git reset --hard HEAD` แล้ว `git status --short` = 0 บรรทัด

### Codex รอบ 3 (CHANGES_REQUESTED) — แก้แล้ว
- `git reset --hard HEAD` ยังทำงานแม้ตรวจ patch สำรองไม่ผ่าน → ต่อด้วย `&&`: `test -s <patch> && git reset --hard HEAD && echo RESET OK || echo "ไม่ได้ reset"`
- ทดลองใน git repo ชั่วคราว (ไฟล์ f ถูกแก้ค้าง) — ไม่มีไฟล์ patch / patch ว่าง ต้องไม่ reset, patch จริงจึง reset (output จริง):
```
--- case 1: no patch file
NOT RESET
 M f
--- case 2: empty patch
NOT RESET
 M f
--- case 3: real patch (7 lines)
HEAD is now at 638302e init
RESET OK
0
```

### ยังไม่ได้ทำ
- ยังไม่ได้รันขั้นตอนบน server จริง (ไม่มีสิทธิ์เข้า server จากเครื่องนี้)

## หลักฐาน: งาน #16 — รวมการแก้บน server เข้า repo

### ที่มา
เตรียม deploy (ssh เข้า server ผ่าน VPN) พบ server ค้างที่ `a93a5b1` + แก้ค้าง 8 ไฟล์ + route ใหม่ที่ไม่อยู่ใน git 1 ตัว — เป็นการแก้บั๊ก/ฟีเจอร์จริง (ไม่ใช่ไฟล์ทดลอง)
สำรองไว้บน server แล้ว: `~/paymonth-backup/20261124-1510/` (`server-changes.patch`, `untracked-payvouchers-export.tgz`, `env.backup`, `old-commit.txt`, สิทธิ์ 700/600) — ผู้ใช้ยืนยัน "keep all"

### สิ่งที่ย้ายเข้า repo (ปรับให้เข้ากับงาน #11–#14)
| บน server | ใน repo |
|-----------|--------|
| `api/deegars` POST แปลง BigInt/Decimal ก่อนส่ง | เหมือนกัน (`serializeDeegarItem`) |
| ชื่อไฟล์ export ภาษาไทย (KTB เช็ค/ฎีกา) — โค้ดซ้ำในแต่ละ route | helper เดียว `src/lib/attachment.ts` ใช้ใน 3 route |
| route ใหม่ `api/reports/payvouchers/export` ตรวจแค่ login, FROM/WHERE เขียนซ้ำกับหน้ารายการ | **เพิ่ม `isStaff`**; FROM/WHERE ใช้ร่วมกับหน้ารายการ (`src/lib/payvouchersQuery.ts`); whitelist ช่องค้นหาแบบ own-property (`__proto__`/`toString` ใช้ pnumber); ไม่ส่งข้อความ error ภายใน |
| ปุ่มส่งออก Excel ใช้ค่าในฟอร์ม | ปุ่ม Bootstrap `btn-success` + ไอคอน lucide, ใช้ตัวกรองของการค้นหาครั้งล่าสุด (เหมือนงาน #12), ปิดไว้จนกว่าจะค้นหา |
| หัวหน้า "ทะเบียนคุมหลักฐานการจ่าย", คำผิด "ทดรอง" | เหมือนกัน |
| ค้นหาฎีกา: FROM salary, ตัด NODEEGAR, join TRIM ทั้งสองฝั่ง | เหมือนกัน + join แบบเร็ว `deegarFromSalaryMatch` (ตรวจข้อมูลจริงก่อน fallback TRIM) — วัดบน DB local 0.97 s → 0.05 s; ยอดรวมทั้งผลค้นหา (งาน #12) โดย **ภาษี/ค่าปรับนับฎีกาละครั้ง**; ลำดับไม่ซ้ำ (`salary.ID, bank.id`) |
- เทสต์: ใหม่ `tests/server-port.test.mjs` 7 ข้อ; `tests/report-queries.test.mjs` ปรับข้อของ salaries/deegars ให้ตรงกับการ join แบบใหม่ (เดิมบังคับ join จาก deegar)

### ตรวจกับข้อมูลจริง (`next start -p 9104`, DB local)
- ค้นหาฎีกา P680000017: DB `SELECT COUNT(*), SUM(MONEY) FROM salary WHERE PNUMBER LIKE '%P680000017%'` = 101 / 267,789,572.00 → API total 101, totals.money 267,789,572; ดึงทีละ 5 แถวจนครบ = 101 แถวไม่ซ้ำ ผลรวม 267,789,572; ~140 ms
- ภาษีไม่นับซ้ำ: ฎีกา A640000133 (ฎีกาเดียว ภาษี 26.17 มีรายการเงิน 2 แถว + อีก 1 แถวที่ไม่มีฎีกาคู่) → totals.tax 26.17 (ถ้ารวมทุกแถวจะได้ 52.34), money 2,826.17 = DB; แถวที่ไม่มีฎีกาคู่แสดงโดยภาษีว่าง
- ส่งออก Excel ทะเบียนคุมหลักฐานการจ่าย 2025-01-01..2025-01-31: ไฟล์ xlsx (`PK`) ชีต PayVouchers 880 แถวข้อมูล + หัว 8 คอลัมน์, ผลรวมจำนวนเงิน 109,829,429.11 = หน้ารายการ (total 880, totalMoney 109,829,429.11); admin 200, ผู้ใช้ทั่วไป **403**, ไม่ login 401, ไม่มีช่วงวันที่ 400, `field=__proto__` 200 (ใช้ pnumber)
- หน้า: ปุ่ม "ส่งออก Excel" disabled ก่อนค้นหา → หลังค้นหาลิงก์ตามช่วงวันที่ที่ค้น → แก้วันที่ในฟอร์มแต่ไม่กดค้นหา ลิงก์ยังเป็นช่วงเดิม; หัวหน้า "ทะเบียนคุมหลักฐานการจ่าย"; ค้นหาฎีกาเหลือช่อง PNUMBER ช่องเดียว
- Content-Disposition KTB เช็ค: `filename="31310248649_..."; filename*=UTF-8''31310248649_...` 

```
$ npx tsc --noEmit -p .
tsc exit 0

$ npm test
✔ latest-salary/regisdeegar joins go through keyJoin with a runtime data check (1.4324ms)
✔ deegar search (salary-first) joins through keyJoin with runtime checks for both key sets (0.4683ms)
✔ every writer of salary/regisdeegar trims PNUMBER (and NODEEGAR) before saving (0.7011ms)
✔ attachmentHeader: ASCII fallback + RFC 5987 UTF-8 name for Thai filenames (1.099ms)
✔ payvoucherWhere: date range always, search column only from the whitelist (0.8972ms)
✔ payvouchers export: staff only, same FROM/WHERE as the list, all rows, Thai-safe filename (0.7343ms)
✔ KTB exports use the Thai-safe filename header (0.4638ms)
✔ payvouchers page: export button uses the last applied search; title renamed (0.349ms)
✔ creating a deegar returns plain numbers (no BigInt in JSON) (1.0287ms)
✔ deegar search page has no NODEEGAR filter; summary typo fixed (0.6012ms)
ℹ tests 73
ℹ pass 73
ℹ fail 0
ℹ skipped 0
npm test exit 0
```
eslint `src`: 252 (ก่อนงาน #11 = 267) ไม่มีปัญหาใหม่; `next build` ✓ (69/69 — เพิ่ม `/api/reports/payvouchers/export`)

### Codex รอบ 1 (CHANGES_REQUESTED) — แก้แล้ว
- `filename*` ใช้ `encodeURIComponent` ซึ่งไม่ escape `' ( ) *` (RFC 5987 attr-char ไม่อนุญาต) → escape เพิ่มใน `rfc5987()`; เทสต์ใหม่: ชื่อ "ฎีกา (ครั้งที่ 2) O'Neil*" → ทุกตัวใน `filename*` เป็น attr-char, มี %28 %29 %27 %2A, decode กลับได้ชื่อเดิม
```
✔ attachmentHeader: ASCII fallback + RFC 5987 UTF-8 name for Thai filenames (1.0256ms)
ℹ tests 73
ℹ pass 73
ℹ fail 0
npm test exit 0
```

## หลักฐาน: งาน #17 — deploy ขึ้น test-paymonth (2026-11-24)

ทำตาม `docs/DEPLOY.md` ทาง ssh (`paymonth` → phoubon-test-paymonth@192.168.25.10 ผ่าน VPN) หลังผู้ใช้ยืนยัน "deploy now"

| ขั้น | ผล (output จริง) |
|-----|-----------------|
| ตรวจก่อน | HEAD `a93a5b1`, แก้ค้าง 8 ไฟล์ + route ไม่อยู่ใน git 1 ตัว, PM2 online, node v22.21.1, MariaDB 10.11.19, `AUTH_SECRET` 54 ตัว ไม่ตรงกับค่าที่หลุด (เทียบ sha256), DB 660 MB, index ใหม่ยังไม่มีสักตัว, `useronline` มีรหัสผ่าน 14,693 แถว, precheck key เว้นวรรค = 0 |
| 1.1 สำรองโค้ด/.env | `~/paymonth-backup/20261124-1510/` (drwx------): `server-changes.patch` 17,400 B, `untracked-payvouchers-export.tgz`, `env.backup`, `old-commit.txt` |
| 1.2 สำรอง DB | รอบแรก `--lock-all-tables` → `Access denied; you need ... RELOAD` → **DUMP FAILED** หยุดเองก่อนล็อก (pipefail ทำงาน); รอบสอง `--lock-tables` → DUMP OK 31 วินาที, gzip OK, `-- Dump completed on 2026-11-24 15:24:35`, 16 ตาราง, 58,388,899 B (-rw-------) |
| 2 คืนไฟล์ | `test -s patch && test -s tgz && git reset --hard HEAD && mv <route ใหม่> <backup>` → CLEAN OK, `git status` ว่าง |
| 4 deploy | `git pull --ff-only` → `4ac8434`, `npm ci`, `prisma generate` ผ่าน; **`npm run build` ล้ม** "Cannot find module '../../../src/app/api/auth/thaiid-login/route.js'" จาก `.next/dev/types/validator.ts` (ของ `next dev` เก่าบน server, tsconfig รวมโฟลเดอร์นี้) — แต่สายคำสั่งของผมต่อ build เข้า `| grep` โดยไม่มี pipefail จึงไป `pm2 restart` ต่อ → แอปหา build ไม่เจอ ล่มวน (log: "Could not find a production build" 15:27:07–15:28:13) |
| แก้ | `rm -rf .next/dev` (ไม่มี `next dev` รันอยู่) → build ใหม่ด้วย pipefail ผ่านใน 39 วินาที (✓ Compiled successfully, 69/69) → restart → `Ready in 1901ms` 15:28:19, `/login` 200 — **ล่มรวมราว 2.5 นาที** (ตั้งแต่ build ล้าง `.next` ~15:26 ถึง 15:28:19) |
| 5 SQL | clear passwords: 14,693 → 0 (0 วินาที); report indexes: ครบ 5 ตัว (14 วินาที); paydirect index: `idx_paydirect_cid = C,A,B` (11 วินาที) |
| 6 ตรวจหลัง deploy | ด้านล่าง |

ตรวจบน server (script ชั่วคราวเซ็น session ทดสอบอายุ 5 นาทีด้วย AUTH_SECRET ของ server บนเครื่อง server เอง ไม่ส่งออกมา ลบ script หลังรัน; ยิง `http://127.0.0.1:9102`):
- `/login`, `/officers`, `/reports` = 200; หน้า login เป็น Bootstrap (`card shadow-lg`, `input-group`)
- ประวัติจ่ายตรงรายคน (คนที่มี 129 รายการ): 62 / 32 / 27 ms
- `/api/officers?pageSize=100` = 100 แถว (เดิมตัดที่ 50) 58 ms
- ค้นหาฎีกา P680000017: total 101, money 267,789,572 (ตรงกับ local) — 365–877 ms
- ส่งออก Excel ทะเบียนคุมหลักฐานการจ่าย ม.ค. 2025: admin 200 (400,342 B, ชื่อไฟล์ RFC 5987), status user **403**
- `/api/users`: status user 403, ไม่ login 401
- PM2 `paymonth-nextjs` online, `git status` บน server ว่าง

### ยังเหลือ / ข้อสังเกต
- **`/api/reports/all` บน server ช้า ~5 วินาที ทุกครั้ง** (3 รอบ: 5.4 / 5.3 / 4.9 s ที่ 10 แถวต่อหน้า) ขณะที่ DB local ข้อมูลชุดเดียวกัน 0.5–1 s — ไม่ใช่ผลจากงานนี้ (ก่อน deploy ก็ไม่มี index เลย) ต้องสืบต่อว่าทำไม server ช้ากว่า (เครื่อง/การตั้งค่า MariaDB/สถิติ index)
- `docs/DEPLOY.md` แก้ตามที่เจอ: ใช้ `--lock-tables`, ลบ `.next/dev` ก่อน build, `test -f .next/BUILD_ID` ก่อน restart, ห้ามต่อ build เข้า grep
- สำรองบน server (`~/paymonth-backup/20261124-1510/`, มี DB dump ข้อมูลบุคคลจริง) — **ลบแล้ว 2026-11-24** ตามที่ผู้ใช้ยืนยัน (`rm -rf ~/paymonth-backup` → ตรวจแล้วไม่มีโฟลเดอร์, `.env` ของแอปยังอยู่, `/login` 200)

### Codex (งาน #17) รอบ 1 (CHANGES_REQUESTED) — แก้แล้ว
- `--lock-tables` ใช้ READ LOCAL → ตาราง MyISAM ยังรับ INSERT ต่อท้ายได้ระหว่าง dump → snapshot ไม่รับประกันว่าสอดคล้องกัน: คู่มือให้ `pm2 stop paymonth-nextjs` ระหว่าง dump แล้ว `pm2 start` กลับ (user ของแอปไม่มีสิทธิ์ RELOAD จึงใช้ `--lock-all-tables` ไม่ได้)
  - **dump ของวันนี้ทำตอนแอปยังรันอยู่** (31 วินาที) — ถ้ามีคน login/บันทึกระหว่างนั้น แถวใหม่ (เช่น `useronline`) อาจอยู่ในบางตารางแต่ไม่สอดคล้องกับตารางอื่น; ใช้เป็นสำรองกู้คืนทั่วไปได้ แต่ถ้าต้องการ snapshot ที่สอดคล้องแน่นอนให้ dump ใหม่ตามคู่มือ
- ขั้นย้อนกลับ hardcode `a93a5b1` → อ่าน commit จาก `old-commit.txt` ของโฟลเดอร์สำรองที่เลือก ตรวจด้วย `git cat-file -e` ก่อน checkout

## หลักฐาน: งาน #18 — รายงานทั้งหมดบน server ช้า ~5 s

### สมมติฐาน → ตรวจ (ทุกอย่างอ่านอย่างเดียวบน DB server)
1. แยกเวลา query ของ `/api/reports/all` (SHOW PROFILES): server / local
   | query | server | local |
   |-------|--------|-------|
   | Q1 จำนวนต่องวด | 1.21 s | 0.34 s |
   | Q2 ยอดเงินรวม (EXPLAIN: salary `type=ALL` 332,613 แถว + `eq_ref` officer/cpay ทีละแถว) | 3.03 s (อีกรอบ 1.90 s) | 0.46 s |
   | Q3 รายการหน้าปัจจุบัน (งวดล่าสุด) | 0.007 s | — |
   (Q1, Q2 รันพร้อมกัน → เวลาต่อครั้ง ≈ Q2 ≈ ที่วัดได้ 4.9–5.4 s; ค่า 0.9 s ของ Q3 ในรอบแรกมาจาก subquery หาปีล่าสุดในสคริปต์ทดสอบเอง ไม่ใช่ query ของแอป)
2. ดิสก์หรือ CPU? `SELECT BENCHMARK(5000000, MD5('paymonth'))` server **8.41 s** / local 1.75 s (CPU ช้ากว่า ~4.8 เท่า; Xeon E5-2620 v3, 8 vCPU, load avg ~2.6); อ่าน salary ทั้งตาราง `SELECT SUM(MONEY) FROM salary ...` server **0.21 s** → ไม่ใช่ดิสก์ (`/dev/rbd7`) — งานที่หนักคือ join ทีละแถว
3. ลองเขียนใหม่ (ผลตรงกันทุกตัว) บน server: Q2 รวมต่อ (CID, IDPAY) ก่อน join **0.65 s** (เดิม 1.90 s รอบเดียวกัน); semi-join `CID IN (SELECT ...)` 1.72 s (ไม่ช่วย); Q1 DISTINCT (ปี, เดือน, CID) ก่อน join **0.72 s** (เดิม 1.15 s)

### แก้
- ใหม่ `src/lib/reportsAllQueries.ts`: `periodCountsSql()`, `totalsSql()` — ตัวกรองแยกฝั่ง salary (ใส่ในส่วนรวมยอด) / officer (`o.NAME LIKE` หลัง join)
- `src/app/api/reports/all/route.ts` ใช้ builder ทั้งสอง; query รายการหน้าปัจจุบัน (Q3) คงเดิม
- เทสต์: `tests/report-queries.test.mjs` +2 — route ใช้ builder และ name filter อยู่ฝั่ง officer; **live DB เทียบ SQL เดิมกับใหม่ 7 กรณี** (ไม่กรอง, ปี, ปี+เดือน, CID ที่มีรายการมากที่สุด, ชื่อ, ชื่อ+ปี, ไม่มีผล) — จำนวนต่องวดทุกงวดและยอดรายรับ/รายจ่ายตรงกันทุกตัว

### ผล (local, `next start -p 9104`)
- `/api/reports/all?page=1&pageSize=10`: 349 / 340 / 327 / 300 ms (เดิม 476–983 ms) — total 111,215, รายรับ 17,818,761,871.94, รายจ่าย 600,425,825.88 (เท่ากับที่ server ให้ก่อนแก้)
- กรองปี 2568: 33 ms; กรองชื่อ "สม": 245 ms
- คาดบน server ราว 1 วินาที (เดิม ~5 s) — วัดจริงหลัง deploy ด้านล่าง

### หลัง deploy (`851a4e7`, GitHub Actions run 45362576137 ผ่านทุกขั้น — deploy อัตโนมัติครั้งแรกที่ผ่านตั้งแต่ ก.พ.)
วัดบน server (script ชั่วคราวเซ็น session 5 นาทีบน server เอง ลบหลังรัน; ยิง `127.0.0.1:9102`):
- `/api/reports/all?page=1&pageSize=10` 5 รอบ: 2073 / 1711 / 1669 / 1689 / 1685 ms (เดิม 4888–5422 ms) — total 111,215, รายรับ 17,818,761,871.94, รายจ่าย 600,425,825.88 **เท่าก่อนแก้**
- size 100: 1717 ms (100 แถว); กรองปี 2568: 162 ms; กรองชื่อ "สม": 1338 ms; `/login` 200; PM2 online, log ไม่มี error, `git status` บน server ว่าง
- เร็วขึ้น ~3 เท่า แต่ช้ากว่าที่คาด (~1 s): Q1 กับ Q2 รันพร้อมกันบน CPU ที่ช้าและมีโหลดอื่น จึงแย่ง CPU กันเอง — ถ้าต้องเร็วกว่านี้ ทางต่อไปคือเก็บยอดรวม/จำนวนต่องวดไว้ชั่วคราว (ค่าไม่ขึ้นกับหน้า) ซึ่งต้องตัดสินเรื่องความสดของข้อมูล

```
$ npx tsc --noEmit -p .
tsc exit 0

$ npm test
✔ reports/all: new per-period paging returns the same rows as the old global sort (live DB) (13187.1566ms)
✔ reports/all runs totals in parallel with the per-period counts (0.3193ms)
✔ reports/all route builds totals and period counts from reportsAllQueries (0.215ms)
✔ reports/all: grouped totals and period counts equal the original per-row joins (live DB) (2864.7015ms)
ℹ tests 75
ℹ pass 75
ℹ fail 0
ℹ skipped 0
npm test exit 0
```
eslint `src`: 249 (ก่อนงาน #11 = 267) ไม่มีปัญหาใหม่; `next build` ✓

## หลักฐาน: งาน #19 — ย้ายไป Coolify

### ไฟล์ที่เพิ่ม/แก้
- `Dockerfile` (multi-stage, node:20-bookworm-slim, รันเป็น user `app`, พอร์ต 3000), `.dockerignore` (ไม่ใส่ `.env*`, `*.sql`, `docs`, `tests` ใน image)
- `next.config.ts`: `output: "standalone"` — `next start` บน PM2 เดิมยังใช้ได้
- ต้องตั้ง `AUTH_TRUST_HOST=true` ใน Coolify: แอปอยู่หลัง proxy (Traefik) — ไม่ตั้งแล้ว Auth.js ฟ้อง `UntrustedHost` ทุก request ที่ `/api/auth/*` (เจอตอนทดสอบ image)

### ทดสอบ image ในเครื่อง (`docker run` ต่อ DB local ผ่าน host.docker.internal:3310)
```
$ node scripts/local-smoke.mjs http://localhost:3999
✔ admin login -> 200 + session cookie — status 200
✔ user login -> 200 + session cookie — status 200
✔ user ดูข้อมูลคนอื่น -> 403 (กัน IDOR) — status 403
✔ admin /api/cheques -> 200 — status 200, 436ms
... (16 ข้อ)
ALL PASSED
$ npm test
ℹ pass 75
ℹ fail 0
```

### Codex (งาน #19) รอบ 1 (CHANGES_REQUESTED) — แก้แล้ว
- Dockerfile ใช้ Node 20 ซึ่งหมดอายุ เม.ย. 2026 → เปลี่ยนเป็น `node:24-bookworm-slim` ทั้ง 3 stage + `@types/node` ^24
- ทดสอบใหม่: `docker exec pm-test node -v` → `v24.22.3`; `node scripts/local-smoke.mjs http://localhost:3999` → `ALL PASSED`; `npm test` → `pass 75 / fail 0`; `npx tsc --noEmit` ไม่มี error
- (รอบก่อนหน้านั้น hook ปฏิเสธเพราะ diff 184,988 ตัวอักษร: สาเหตุคือแก้ TASK_BOARD ด้วย Python บน Windows แล้ว line ending กลายเป็น CRLF ทั้งไฟล์ — คืนเป็น LF แล้ว ไม่ได้ใช้ --rebaseline)

### สถานะตอนพัก (2026-11-25)
ทำแล้ว:
- Coolify (coolify.phoubon.in.th) project **paymonth** / env production:
  - `paymonth-db` — MariaDB 11, user `paymonth`, database `paymonth`, Running — **ยังว่าง ไม่มีตาราง** (ตรวจด้วย Terminal ของ container)
  - `paymonth-nextjs` — Dockerfile build pack, พอร์ต 3000, โดเมน `https://test-paymonth.phoubon.in.th`; build แรก (`2d92cb0`) ผ่าน; redeploy `65ecd7b` ค้างสถานะ In Progress ไม่มี log
  - env ครบ 13 ตัว (`AUTH_SECRET` และ `AUTH_THAIID_*` คัดลอกจาก `.env` server เดิม — ใช้ AUTH_SECRET เดิมได้ ผู้ใช้ไม่ต้อง login ใหม่ตอนย้าย)
- dump ทดลอง 2026-11-24 17:26 (แอปเดิมหยุด 33 วินาที, 16 ตาราง) — **ลบทั้งบนเครื่องและบน server แล้ว 2026-11-25** (ตรวจ `ls` ไม่พบ, `.env` ยังอยู่, `/login` 200)

ยังเหลือ (ตามลำดับ):
1. แก้ `DATABASE_URL` ของ paymonth-nextjs เป็น "MariaDB URL (internal)" ของ paymonth-db (`mysql://paymonth:…@rv6igjl77z30h2cog8nftzwx:3306/paymonth`) — ตอนนี้ยังเป็น `…@localhost:3306/test-paymonth` ของ server เดิม ซึ่ง container ต่อไม่ได้
   - ข้อควรรู้: ช่อง URL ใน Coolify เป็น password field — ต้องกดรูปตาให้แสดงก่อน Ctrl+C ไม่งั้นเบราว์เซอร์ไม่ copy (ลองแล้ว 3 รอบค่าไม่เปลี่ยน)
2. **ซ้อมก่อน (ไม่ใช่รอบจริง):** dump แบบ DEPLOY.md ขั้น 1.2 (`pm2 stop` → `mysqldump --lock-tables --routines` + ตัด `DEFINER` → `pm2 start`) → import ผ่าน paymonth-db → Import Backup (ไม่มี SSH เข้าเครื่อง Coolify) → ทำข้อ 3 เพื่อพิสูจน์ว่าแอปบน Coolify ใช้งานได้ — ข้อมูลรอบซ้อมจะเก่าทันทีที่แอปเดิมเปิดกลับ
2b. **รอบจริง (ปิดการเขียนตั้งแต่ dump จนสลับเสร็จ — Codex งาน #19):** แจ้งผู้ใช้ปิดปรับปรุง → `pm2 stop paymonth-nextjs` แล้ว**ไม่เปิดกลับ** → dump → import (แทนข้อมูลรอบซ้อม) → ตรวจจำนวนแถวเทียบ server เดิมขณะที่ยังหยุดอยู่ → ทำข้อ 4 — ระหว่าง DNS กระจาย ใครที่ยังวิ่งไป server เดิมจะเข้าไม่ได้ (ดีกว่าเขียนลง DB เก่าแล้วหาย) — ลบ dump ทุกที่หลัง import
3. ตรวจจำนวนแถวทุกตารางเทียบ server เดิม (ใช้ `COUNT(*)` ต่อตาราง) → ยกเลิก deploy ที่ค้าง แล้ว Redeploy → ทดสอบ login / รายงาน
4. ชี้ DNS `test-paymonth.phoubon.in.th` (ตอนนี้ A → 49.231.243.201) ไปเครื่อง Coolify — ทำหลังข้อ 3 ผ่าน; callback ThaiID เป็นโดเมนเดิม ไม่ต้องลงทะเบียน DOPA ใหม่
5. หลังย้ายเสร็จ: ปิด GitHub Actions deploy บน server เดิม (ไม่งั้น push ครั้งต่อไปจะ `pm2 restart` แอปเดิมกลับมารับการเขียนลง DB เก่า), `pm2 delete paymonth-nextjs` + `pm2 save`, อัปเดต `docs/DEPLOY.md`

### Codex (งาน #19) รอบ 2 (CHANGES_REQUESTED) — แก้แล้ว
- แผนเดิมเปิดแอปเก่ากลับหลัง dump รอบสุดท้าย → การเขียนระหว่างนั้นจนถึงสลับ DNS จะหายจาก DB ใหม่: แยกเป็นรอบซ้อม (2) กับรอบจริง (2b) ที่หยุดแอปเดิมตั้งแต่ dump จนสลับเสร็จ และตรวจจำนวนแถวขณะยังหยุดอยู่; ข้อ 5 ปิด GitHub Actions ก่อนเพื่อไม่ให้ push ปลุกแอปเดิม


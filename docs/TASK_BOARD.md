# Task Board

| # | งาน | สถานะ | หลักฐาน (test output / Codex review) |
|---|-----|-------|--------------------------------------|
| 0 | ติดตั้ง pstack (CLAUDE.md, Stop hook, scripts) + เขียน PRD.md จากโค้ดเดิม | เสร็จ | ไม่มีการแก้โค้ดแอป; `python scripts/cross_review.py` หลัง commit |
| 1 | [วิกฤต] ปิด/แก้ `POST /api/auth/thaiid-login` ที่ออก session จาก `pid` ใน body โดยไม่ตรวจ (PRD ข้อ 8.1) | เสร็จ | ดู "หลักฐาน: งาน #1" ด้านล่าง |
| 2 | [สูง] ตรวจสิทธิ์เจ้าของข้อมูลใน API payperson และ route รายคนที่ใช้แค่ `verifySession` (PRD 8.2) | เสร็จ | ดู "หลักฐาน: งาน #2" ด้านล่าง |
| 2b | [สูง] route ฝั่งงานคลัง (นำเข้า paydirect, เช็ค, ฎีกา, หน่วยงาน, รายงาน, export KTB, users) ยังไม่ตรวจบทบาท — USER เรียกได้ (PRD 8.3); `/api/users` GET คืนคอลัมน์ password ด้วย | รอ | |
| 2c | [กลาง] จำกัด EDITOR ตามหน่วยงาน และให้ middleware ใช้เกณฑ์เดียวกับ `canAccessCid` (status ว่าง = สิทธิ์จำกัด) | รอ | |
| 3 | [สูง] เลิกบันทึกรหัสผ่านลง `useronline` (PRD 8.4) | รอ | |
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

# Task Board

| # | งาน | สถานะ | หลักฐาน (test output / Codex review) |
|---|-----|-------|--------------------------------------|
| 0 | ติดตั้ง pstack (CLAUDE.md, Stop hook, scripts) + เขียน PRD.md จากโค้ดเดิม | เสร็จ | ไม่มีการแก้โค้ดแอป; `python scripts/cross_review.py` หลัง commit |
| 1 | [วิกฤต] ปิด/แก้ `POST /api/auth/thaiid-login` ที่ออก session จาก `pid` ใน body โดยไม่ตรวจ (PRD ข้อ 8.1) | เสร็จ | ดู "หลักฐาน: งาน #1" ด้านล่าง |
| 2 | [สูง] ตรวจสิทธิ์เจ้าของข้อมูลใน API payperson และ route ที่ใช้แค่ `verifySession` (PRD 8.2–8.3) | รอ | |
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

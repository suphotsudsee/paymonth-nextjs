# PRD — ระบบเงินเดือน/จ่ายตรง (paymonth-nextjs)

> เขียนย้อนหลังจากโค้ดที่มีอยู่ (reverse-engineered, 2026-11-23) เพื่อใช้เป็นจุดตั้งต้นของ pstack
> ทุกข้อในเอกสารนี้อ้างอิงพฤติกรรมของโค้ดจริง ณ commit baseline ส่วนที่ระบุว่า "ต้องยืนยัน" คือสิ่งที่โค้ดไม่ได้บอกชัด
> ให้เจ้าของระบบตรวจแก้ก่อนใช้เป็นข้อกำหนด

## 1. ภาพรวม

เว็บแอปบริหารการจ่ายเงินเดือน/ค่าตอบแทนเจ้าหน้าที่ของหน่วยงาน (โดเมน `phoubon.in.th`) ครอบคลุม
- ทะเบียนเจ้าหน้าที่ บัญชีธนาคาร และรายการรับ-จ่ายรายเดือน (salary)
- ทะเบียนคุมงบ: ฎีกา (deegar), เช็ค (cheque), ทะเบียนคุมเบิกจ่ายฎีกา (regisdeegar)
- นำเข้าไฟล์ข้อมูลจ่ายตรงเงินเดือน (paydirect) และแสดงสลิปให้เจ้าหน้าที่ดูของตัวเอง
- รายงาน/ไฟล์ส่งธนาคารกรุงไทย (KTB), สรุปภาษี, ทะเบียนคุมใบสำคัญจ่าย, กราฟรายรับรายจ่าย
- จัดการผู้ใช้ และบันทึกการเข้าใช้งาน (useronline)

ปีและเดือนใช้ **ปฏิทินไทย (พ.ศ.)** เก็บเป็นข้อความ: `YEARTHAI` 4 หลัก (เช่น `2568`), `MONTHTHAI` 2 หลัก (`01`–`12`)

## 2. Tech stack และการ deploy

| ส่วน | รายละเอียด |
|------|-----------|
| Framework | Next.js 16.0.7 (App Router), React 19.2.1, TypeScript 5 |
| DB | MySQL ผ่าน Prisma 6.19 (`prisma/schema.prisma`) — query ส่วนใหญ่ใช้ `$queryRawUnsafe` แบบ parameter `?` |
| Auth | JWT (`jose`, HS256) ใน cookie `session` อายุ 8 ชม. + NextAuth v5 beta (provider ThaiID/DOPA) |
| ไฟล์ | `xlsx` สำหรับ export Excel, `iconv-lite` สำหรับถอด TIS-620/UTF-16 ตอนนำเข้า |
| Runtime | `next start -p 9102`, PM2 (`ecosystem.config.js`, fork 1 instance, restart ที่ 1GB) |
| CI/CD | `.github/workflows/deploy.yml` |
| เทสต์ | `npm test` (`node --test`, ไฟล์ใน `tests/`) — ตอนนี้มีเฉพาะเทสต์ regression ของ auth; เทสต์ของ pstack อยู่ที่ `scripts/test_cross_review.py` |

ตัวแปรแวดล้อมที่โค้ดใช้: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_DEBUG`,
`AUTH_THAIID_ID/SECRET/AUTH_URL/TOKEN_URL/USERINFO_URL/CALLBACK/SCOPE/API_KEY` (มีชื่อสำรอง `THAID_*`)

## 3. ผู้ใช้และสิทธิ์

ตาราง `user` (`status` เป็นข้อความ, `accessLevel` เป็นตัวเลข) แปลงเป็นบทบาทดังนี้ (`src/lib/session.ts`, `src/lib/permissions.ts`):

| บทบาท | เงื่อนไข | สิทธิ์ตามที่โค้ดตั้งใจ |
|-------|---------|-----------------------|
| ADMIN | status มีคำว่า `admin` หรือ `manager` หรือ `accessLevel >= 1` | ทุกอย่าง |
| EDITOR | status มีคำว่า `editor` | ข้อมูลจ่ายตรง/เจ้าหน้าที่เฉพาะหน่วยงานตัวเอง (`officer.CODE` = หน่วยของผู้ใช้) |
| USER | status = `user` | เฉพาะหน้าของตัวเอง (`/officers/<cid>`, สลิป paydirect/payperson ของตัวเอง) |

การเข้าสู่ระบบ
1. **Username/password** — `POST /api/auth/login`: ต้องผ่าน captcha (`GET /api/auth/captcha` ตั้ง cookie `captcha_sig` = HMAC ของรหัส 6 ตัว),
   เทียบรหัสผ่านแบบ SHA-1 กับ `user.password`, สำเร็จแล้วตั้ง cookie `session`
2. **ThaiID (DOPA)** — redirect ไป DOPA แล้วกลับที่ `/callback` (`src/app/callback/route.ts`) แลก code เป็น token ฝั่ง server
   อ่าน `pid` (เลขบัตร) แล้วหา `user.cid`; ไม่พบ = ปฏิเสธ
3. ทุกครั้งที่ login (สำเร็จ/ไม่สำเร็จ) บันทึกลงตาราง `useronline` (username, password, logined Y/N, ipv4, logindate)

`src/middleware.ts` ป้องกันเฉพาะ path: `/`, `/deegars`, `/cheques`, `/regisdeegars`, `/salaries`, `/paydirect`, `/regisdeegar`, `/officers`
และบังคับให้ USER อยู่ในหน้าของตัวเอง ส่วน API แต่ละตัวตรวจ session เอง

## 4. Schema ฐานข้อมูล (MySQL)

| ตาราง | คีย์ | ความหมาย / ฟิลด์สำคัญ |
|-------|-----|----------------------|
| `officer` | PK `CID` (เลขบัตร 13 หลัก) | เจ้าหน้าที่: `NAME`, `LPOS` (ตำแหน่ง), `CODE` → `station.CODE` (หน่วยงาน, default `000`), `MOBILE`, `EMAIL` |
| `bank` | PK `id`, index `CID` | บัญชีธนาคารของเจ้าหน้าที่ (`IDBANK`, `NAMEBANK`) — 1 คนมีได้หลายบัญชี |
| `cpay` | PK `IDPAY` (5 ตัว) | รหัสรายการรับ-จ่าย: `PAYNAME`, `PAYTYPE` (`'1'` = รายรับ, อื่นๆ = รายจ่าย) |
| `salary` | unique `ID`; unique (`CID`,`IDPAY`,`PNUMBER`,`NODEEGAR`,`NUM`,`MONTHTHAI`,`YEARTHAI`) | รายการเงินรายคน/รายเดือน: `MONEY` decimal(10,2), `BANKID` → `bank.id`, `PNUMBER` default `P000000000`, `NODEEGAR` default `1`, `NUM` default `1` |
| `deegar` | PK `ID`; unique (`PNUMBER`,`NODEEGAR`) | ฎีกา: `ACCNUMBER`, `ACCNAME`, `TAX`, `FEE`, `MONEY`, `CHEQUE` → `cheque.CHEQUE` |
| `cheque` | PK `ID`; unique `CHEQUE` (11 ตัว) | เช็ค: `CHEQUENAME`, `ACCNUMBER`, `PAYDATE` |
| `regisdeegar` | PK `ID`; unique `PNUMBER` | ทะเบียนคุมเบิกจ่ายฎีกา: `REGISDATE`, `MONEY`, `TAX`, `MONEYDRAW`, `SENDDATE`, `GFMISNUMBER`, `BANKDATE`, `MONEYBANK`, `GFMISREGIS`, `GFMISDATE`, `CODEBUDGET`, `CODEACTIVE` |
| `paydirect` | PK `ID`; unique (`A`,`B`,`C`) | ข้อมูลจ่ายตรงที่นำเข้าจากไฟล์ คอลัมน์ตามตำแหน่งใน Excel (A..CA) ทุกค่าเป็นข้อความ; `A` = ปี, `B` = เดือน, `C` = CID; ชื่อเฉพาะ: `SALARY`, `TOTALINCOME`, `TAX`, `TOTALOUTCOME`, `BALANCE` ฯลฯ |
| `station` | PK `CODE` (3 ตัว) | หน่วยงาน/สถานที่ปฏิบัติงาน: `DEPART`, `NAMESTATION` |
| `cmonth` | PK `ID` (`01`–`12`) | ชื่อเดือนไทย/อังกฤษ |
| `user` | PK `id`; unique `cid` | ผู้ใช้ระบบ: `username`, `password` (SHA-1 hex), `status`, `accessLevel` |
| `rawofficer` | ไม่มี (Prisma `@@ignore`) | ข้อมูลเก่าจากระบบเดิม ไม่ได้ใช้ผ่าน Prisma Client |
| `useronline` | ไม่อยู่ใน schema.prisma | บันทึกการ login (เขียน/อ่านด้วย raw SQL) |

ความสัมพันธ์ (ไม่มี foreign key จริงใน schema — เชื่อมด้วย JOIN ใน SQL):
`salary.CID → officer.CID`, `salary.IDPAY → cpay.IDPAY`, `salary.BANKID → bank.id`,
`salary.(PNUMBER,NODEEGAR) → deegar`, `deegar.CHEQUE → cheque.CHEQUE`, `deegar.PNUMBER → regisdeegar.PNUMBER`,
`officer.CODE → station.CODE`, `salary.MONTHTHAI → cmonth.ID`

## 5. ฟีเจอร์ (หน้า → API)

| เมนู | หน้า | API | หมายเหตุ |
|------|-----|-----|---------|
| รายชื่อจนท. | `/officers`, `/officers/[cid]` (+ `banks`, `personal`, `salaries`, `paydirect`, `payperson`) | `/api/officers`, `/api/officers/[cid]/*`, `/api/banks` | CRUD เจ้าหน้าที่ บัญชี และรายการเงินรายเดือน |
| สลิปจ่ายตรง | `/officers/paydirect`, `/officers/paydirect/[payid]`, `/paydirect` | `/api/officers/[cid]/paydirect`, `/api/paydirect/report` | กรองตามบทบาทด้วย `buildPaydirectAccessClause` |
| สลิปรายเดือน | `/officers/payperson/[cid]/[yearthai]/[monththai]` | `/api/officers/[cid]/payperson/[yearthai]/[monththai]` | รายรับ = `PAYTYPE='1'`, ไม่รวม `IDPAY='20004'`, ยอดสุทธิ = รับ − จ่าย |
| ทะเบียนฎีกา | `/deegars` | `/api/deegars`, `/api/deegars/[pnumber]/[nodeegar]`, `/api/salaries/deegars` | |
| ทะเบียนเช็ค | `/cheques` | `/api/cheques`, `/api/cheques/[cheque]`, `/api/salaries/cheques` | |
| ทะเบียนคุมเบิกจ่ายฎีกา | `/regisdeegars` | `/api/regisdeegars`, `/api/regisdeegars/[pnumber]`, `/api/regisdeegar` | |
| รหัสหน่วยงาน / รหัสรับ-จ่าย | `/stations`, `/cpays` | `/api/stations`, `/api/stations/departs`, `/api/cpays`, `/api/cmonths` | |
| รายงาน | `/reports/*` (ทั้งหมด, ค้นหาฎีกา/เช็ค, สรุปฎีกา, ตามวันที่, ภาษีตามฝ่าย/ตำแหน่ง/กลุ่ม, ใบสำคัญจ่าย) | `/api/reports/*` | |
| ส่งกรุงไทย | `/reports/ktbdeegar`, `/reports/ktbcheque` | `/api/reports/ktb*/export` | Excel: bank code `006`, เลขบัญชี, ชื่อ, ยอด 2 ตำแหน่ง, CID, เลขเช็ค, `PNUMBER/NODEEGAR`, email, mobile, วันจ่าย |
| กราฟ | `/charts/inout` | `/api/charts/inout` | |
| นำเข้าจ่ายตรง | `/tools/import-paydirect` | `POST /api/paydirect/import` | ดูข้อ 6 |
| จัดการผู้ใช้ / useronline | `/tools/users`, `/tools/useronline` | `/api/users`, `/api/useronline` | |

## 6. กฎทางธุรกิจและเงื่อนไขสำคัญ

- **รายการเงิน (salary)**: ต้องมี `cid`, `idpay`, `bankId`, `monththai`, `yearthai`, `money` เป็นตัวเลข;
  `bankId` ต้องเป็นบัญชีของ `cid` เดียวกัน; `PNUMBER` ไม่เกิน 10 ตัว; เดือนเติม 0 ข้างหน้าเป็น 2 หลัก;
  USER สร้าง/แก้ได้เฉพาะของตัวเอง; ซ้ำตาม unique key 7 ฟิลด์ไม่ได้
- **ฎีกา**: ต้องมี `pnumber`, `accnumber`, `accname`; `NODEEGAR` default `1`; (`PNUMBER`,`NODEEGAR`) ซ้ำ → 409 "เลขฎีกาซ้ำในระบบ";
  การค้นหา page size สูงสุด 50; คอลัมน์ sort ต้องอยู่ใน whitelist
- **นำเข้า paydirect**: ไฟล์ข้อความคั่นด้วย `$` ทีละบรรทัด ตามลำดับคอลัมน์ A..CA;
  ตรวจ encoding: BOM UTF-8 / UTF-16LE / UTF-16BE, ถ้าถอด UTF-8 แล้วมี `�` ถือเป็น TIS-620;
  ใช้ `INSERT IGNORE` → แถวที่ (A,B,C) ซ้ำจะถูกข้าม (ไม่อัปเดต) และรายงานเลขบรรทัดที่ข้าม; บรรทัดว่างข้าม
- **Session**: JWT HS256 อายุ 8 ชม., cookie `httpOnly`, `sameSite=lax`, `secure` เมื่อ production
- **Captcha**: 6 ตัวจากชุดที่ตัดตัวสับสน (ไม่มี I, O, 0, 1) เทียบแบบไม่สนตัวพิมพ์

## 7. Edge cases ที่โค้ดรองรับแล้ว

- repo/DB: BigInt จาก MySQL แปลงเป็น number/string ก่อนส่ง JSON
- เลขบัตรจาก ThaiID อ่านได้หลายชื่อฟิลด์ (`pid`, `citizen_id`, `cid`, `sub`)
- token endpoint ของ ThaiID ตอบ 404 → ลองใหม่โดยเติม `/` ท้าย URL
- IP จาก `x-forwarded-for` / `x-real-ip` แปลง `::1`, `::ffff:` เป็น IPv4
- ไฟล์นำเข้าเป็น TIS-620 / UTF-16 / มี BOM
- USER ไม่มี `cid` ใน session → ถูกส่งไป `/officers/paydirect`

## 8. ปัญหาที่พบจากการอ่านโค้ด (ยังไม่แก้ — ต้องเปิดงานใน docs/TASK_BOARD.md)

ลำดับตามความรุนแรง

1. ~~**[วิกฤต] `POST /api/auth/thaiid-login` login เป็นใครก็ได้**~~ — **แก้แล้ว (TASK_BOARD #1)**: ลบ route ออกทั้งในแอปและ `thaiid-login-package`
   เงื่อนไขที่บังคับด้วยเทสต์ (`tests/auth-routes.test.mjs`): ออก session (`signSession`) ได้เฉพาะ `api/auth/login` และ `callback` เท่านั้น
2. ~~**[สูง] สลิปรายเดือนดูของคนอื่นได้ (IDOR)**~~ — **แก้แล้ว (TASK_BOARD #2)**: route ที่รับ CID แล้วคืนข้อมูลรายคน
   (`officers/[cid]` GET/PUT, `officers/[cid]/personal`, `officers/[cid]/payperson/...`, `salaryuser/report`, `banks` GET)
   เรียก `canAccessCid` → ได้ 403 ถ้า CID ไม่ใช่ของตัวเอง เว้นแต่ status มี admin/manager/editor หรือ `accessLevel >= 1`; `salaryuser/report` เดิมไม่ `await` session จึงไม่ตรวจ login เลย แก้แล้ว
   ยังไม่ได้แก้: EDITOR ยังเห็นทุก CID (ยังไม่จำกัดตามหน่วยงาน); middleware ยังถือ status ว่าง เป็นเจ้าหน้าที่ (ไม่ตรงกับ API)
3. ~~**[สูง] API ส่วนใหญ่ไม่ตรวจบทบาท**~~ — **แก้แล้ว (TASK_BOARD #2b)**: route งานคลังต้องเป็นเจ้าหน้าที่ (`isStaff`), users/useronline ต้องเป็น admin (`hasAdminAccess`), เทสต์ `tests/api-guards.test.mjs` บังคับให้ route ใหม่มี guard; ข้อความเดิม: — ราว 30 route ตรวจแค่ "login แล้ว" เช่น นำเข้า paydirect, เช็ค, ทะเบียนฎีกา (PUT), หน่วยงาน, รายงาน, export KTB
   USER จึงเรียกได้โดยตรง; middleware ไม่ครอบ `/reports`, `/tools`, `/stations`, `/cpays`, `/charts`
4. ~~**[สูง] บันทึกรหัสผ่านเป็นข้อความธรรมดาลง `useronline`**~~ — **แก้แล้วในโค้ด (TASK_BOARD #3)**: บันทึก `NULL` เสมอ; แถวเก่าต้องรัน `prisma/sql/2026-11-23_clear_useronline_passwords.sql` บน DB จริง; ข้อความเดิม: ทุกครั้งที่ login รวมถึงครั้งที่พิมพ์ผิด
5. ~~**[สูง] `AUTH_SECRET` มีค่า fallback ฝังในโค้ด**~~ — **แก้แล้วในโค้ด (TASK_BOARD #4)**: ไม่มี fallback, ปฏิเสธค่าที่หลุดและค่าที่สั้นกว่า 32 ไบต์; server ต้องตั้งค่าใหม่ก่อน deploy; ข้อความเดิม: (`src/lib/auth.ts`) ถ้าลืมตั้ง env ทุกคนที่เห็นโค้ดปลอม session ได้
6. **[กลาง] รหัสผ่านเก็บเป็น SHA-1 ไม่มี salt** และ captcha ไม่มีหมดอายุ/ใช้ซ้ำได้ (signature ผูกกับรหัสอย่างเดียว ไม่มีเวลา/nonce)
7. **[กลาง] export KTB JOIN `bank ON bank.CID = salary.CID`** — คนที่มีหลายบัญชีจะได้หลายแถว (ยอดโอนซ้ำ) ควร JOIN ด้วย `salary.BANKID`
8. **[กลาง] error 500 ส่ง `detail` (ข้อความ error ภายใน) กลับไปให้ client**; `/api/thaiid/exchange` คืน `tokenUrl`/`callbackUrl` เมื่อผิดพลาด
9. **[ต่ำ] `paydirect` เก็บตัวเลขเป็น VarChar** — การรวมยอดต้องแปลงเอง; การนำเข้าซ้ำไม่อัปเดตข้อมูลที่แก้แล้ว
10. **[ต่ำ] `README.md` ล้าสมัย** (พูดถึง carbooking-nextjs, port 9100 ขณะที่ใช้ 9102)

- **8.3b บทบาทต้องดูจาก `status` ไม่ใช่ `accessLevel`** (พบ 2026-11-24, TASK_BOARD #2d): ในข้อมูลจริงผู้ใช้ทั่วไป 12,128 จาก 12,140 คนมี `accessLevel = 1`, manager มี 1 หรือ 8, admin มี 9 → `accessLevel` แยกบทบาทไม่ได้ ใช้ `roleOf()` ใน `src/lib/permissions.ts` ที่เดียว: status ตรงตัว `admin`/`manager` = ADMIN, `editor` = EDITOR, อื่นๆ (รวมว่าง/สะกดผิด/ค่าที่แค่มีคำเหล่านี้ปน) = USER

## 9. ข้อที่ต้องยืนยันกับเจ้าของระบบ

- ความหมายของคอลัมน์ paydirect ที่ยังเป็นตัวอักษร (D..CA) และรูปแบบไฟล์ต้นทาง (มาจากระบบใด)
- `IDPAY = '20004'` ที่ถูกตัดออกจากสลิปคืออะไร และทำไม
- EDITOR ใช้งานจริงหรือไม่ (มีใน `paydirectAccess.ts` แต่ middleware/route อื่นไม่รู้จัก)
- `/api/thaiid/exchange` ยังใช้อยู่หรือเลิกแล้ว (ไม่ออก session แต่คืน token/profile ของ DOPA ให้ client; ถ้าเลิก ควรลบ)
- บัญชี status "นางสาว" และ "๊user" (accessLevel 1) เป็นเจ้าหน้าที่หรือผู้ใช้ทั่วไป — ตอนนี้ถือเป็นผู้ใช้ทั่วไป (TASK_BOARD #2d)
- กฎการปัดเศษ/ภาษีในรายงานภาษี และ bank code `006` ใช้กับทุกบัญชีหรือเฉพาะกรุงไทย

## 10. ย้ายการโหลดข้อมูลไปฝั่ง server (Server Components / Server Actions) — TASK_BOARD #7

### เป้าหมาย
ให้เปิดหน้าแล้วได้ HTML ที่มีข้อมูลครบใน request เดียว เหมือน PHP (เบราว์เซอร์ขอหน้า → server query DB → ส่ง HTML)

### สภาพปัจจุบัน (สำรวจ 2026-11-23)
- หน้าใน `src/app` มี 39 ไฟล์: เป็น client component (`'use client'`) 34 ไฟล์ (~13,000 บรรทัด), server component 5 ไฟล์
- หน้า client โหลดข้อมูลแบบ waterfall: HTML เปล่า → โหลด JS → hydrate → `fetch('/api/...')` → API ตรวจ session อีกรอบ → DB → render
  ผู้ใช้จึงรอ 2 round trip + เวลาโหลด/รัน JS ก่อนเห็นข้อมูล (PHP รอแค่ 1 round trip)
- session ถูกตรวจซ้ำ 3 ครั้งต่อการเปิดหน้า: middleware, `(dashboard)/layout.tsx`, และ API route
- production รัน `next start` (ไม่ใช่ dev) ผ่าน PM2 ใน fork mode, instance เดียว
- index ใน DB: `salary` มี unique key ขึ้นต้นด้วย CID (ค้นรายคนใช้ index ได้); `paydirect` มี key (A=ปี, B=เดือน, C=CID) ค้นด้วย CID อย่างเดียวจะ scan ทั้งตาราง

### สมมติฐานที่ต้องพิสูจน์ก่อนทำทั้งหมด (Attack the Premise)
การย้ายไป server component ตัด round trip ที่ 2 และเวลารอ JS ได้ แต่ถ้าที่ช้าจริงคือ query DB การย้ายจะไม่ช่วยมาก
จึงทำหน้าทดลองก่อน 1–2 หน้า วัดเวลาก่อน/หลัง (TTFB และเวลาจนเห็นข้อมูล) แล้วค่อยตัดสินใจทำหน้าที่เหลือ

### หลักการแปลง
- หน้าอ่านข้อมูล: `page.tsx` เป็น async server component เรียก query ตรง (ไม่ผ่าน `fetch` ไป API ของตัวเอง)
- query และการตรวจสิทธิ์ย้ายไปเป็นฟังก์ชันใน `src/lib/data/*.ts` (`import 'server-only'`) ใช้ร่วมกันระหว่างหน้าและ API route
  → guard เดิม (`isStaff` / `canAccessCid` / `hasAdminAccess`) ต้องถูกเรียกในฟังก์ชันเหล่านี้ ไม่ใช่แค่ใน route
- ตัวกรอง/แบ่งหน้า ใช้ `searchParams` ใน URL (ลิงก์/ฟอร์ม GET) แทน state ใน client
- ส่วนที่ต้องโต้ตอบจริง (ฟอร์มแก้ไข, modal, ปุ่มพิมพ์) แยกเป็น client component เล็กๆ รับข้อมูลเป็น props
- การเขียนข้อมูล (เพิ่ม/แก้/ลบ) ใช้ Server Actions ที่เรียก guard ตัวเดียวกับ API
- API route เดิมยังเก็บไว้ (export Excel/KTB, import ไฟล์, ระบบอื่นที่อาจเรียก) จนกว่าจะยืนยันว่าไม่มีใครใช้
- เวลาโหลดของ server component ต้องไม่ตรวจ session ซ้ำเกินจำเป็น: ใช้ `React.cache` ห่อ `verifySession` ต่อ request

### Edge cases
- ผู้ใช้ USER เปิดหน้าของคนอื่น: server component ต้องคืน 403/redirect เหมือน API (ห้ามพึ่ง middleware อย่างเดียว)
- หน้า print/สลิป: ต้องได้ HTML ครบตั้งแต่ server เพื่อสั่งพิมพ์ได้ทันที
- ข้อมูลเงินเดือนต้องไม่ถูก cache ข้ามผู้ใช้: ทุกหน้าที่อ่าน cookie เป็น dynamic อยู่แล้ว ห้ามใช้ `unstable_cache`/`'use cache'` กับข้อมูลรายคน
- DB error ต้องแสดงหน้า error ทั่วไป (`error.tsx`) ไม่ส่งรายละเอียด SQL ไปเบราว์เซอร์ (เกี่ยวกับ PRD 8.8)
- ปุ่ม export/ดาวน์โหลดยังเรียก API route เดิม

### ลำดับ (ทีละโมดูล พร้อมเทสต์)
1. วัด baseline บน server จริง: TTFB และเวลาจนเห็นข้อมูล ของหน้าสลิปและหน้ารายการเงินเดือนรายคน
2. หน้าทดลอง: `officers/[cid]/payperson` และ `officers/payperson/[cid]/[yearthai]/[monththai]` (ผู้ใช้ทั่วไปเปิดบ่อยที่สุด)
3. หน้ารายคนที่เหลือ: personal, paydirect, salaries
4. รายงาน (reports/*) — อ่านอย่างเดียว เหมาะกับ server component ที่สุด
5. หน้าจัดการข้อมูล (cheques, deegars, regisdeegars, cpays, stations, users, officers) — server component + Server Actions
6. login/logo/policy/term: login ยังต้องเป็น client (captcha, ฟอร์ม); policy/term เปลี่ยนเป็น server ได้ทันที

### 10.1 index และ query ของรายงาน (TASK_BOARD #10, ทำแล้ว)
- index ที่รายงานพึ่ง: `salary(PNUMBER, NODEEGAR, DUPDATE, ID)`, `salary(YEARTHAI, MONTHTHAI, CID, IDPAY)`, `deegar(CHEQUE)`, `cheque(PAYDATE)`, `bank(CID)` — สร้างด้วย `prisma/sql/2026-11-24_report_indexes.sql`
- join จาก deegar ไป salary/regisdeegar: ถ้า key ฝั่งนั้นไม่ขึ้นต้นด้วยเว้นวรรค (ทุก route ที่เขียน trim ก่อนบันทึก) ใช้ `s.PNUMBER = TRIM(deegar.PNUMBER)` ซึ่งใช้ index ได้; โค้ดตรวจข้อมูลเองตอนรัน (จำผล 5 นาที) ถ้าพบจะใช้ TRIM ทั้งสองฝั่งแบบเดิม (ถูกแต่ช้า) — `src/lib/keyJoin.ts`, `src/lib/keyHygiene.ts`; ถ้า import ข้อมูลเข้าตารางเหล่านี้ตรงๆ ควร trim
- มีแถวขยะ `salary.YEARTHAI = 'YEAR'` — ทุกที่ที่หา "ปีล่าสุด" ต้องกรองเฉพาะตัวเลข 4 หลัก
- รายงานทั้งหมด แบ่งหน้าตามงวดก่อน (`src/lib/reportPaging.ts`) ลำดับยังเป็น ปี desc, เดือน desc, ชื่อ asc


## 11. หน้าจอใช้ Bootstrap 5 ทั้งเว็บ (TASK_BOARD #11)

### เป้าหมาย
หน้าตาทุกหน้าใน `src/app/**` และ `src/components/**` ใช้ Bootstrap 5.3 (npm `bootstrap`) อย่างเดียวกันทั้งเว็บ
แทน CSS module ที่แต่ละหน้าเขียนเอง (เดิม 30 ไฟล์ ~6,000 บรรทัด ซ้ำกันเกือบทั้งหมด) **โดยไม่เปลี่ยน logic, API, สิทธิ์ หรือข้อความที่แสดง**

### ข้อกำหนด
- ติดตั้ง `bootstrap@5.3.x` import `bootstrap/dist/css/bootstrap.min.css` ครั้งเดียวใน `src/app/layout.tsx` ก่อน `globals.css`
- **ไม่ใช้ Bootstrap JS** (bundle/Popper): navbar collapse, dropdown, modal ใช้ state ของ React + class `show`/`d-block` ของ Bootstrap
  เหตุผล: หน้าเป็น client component ที่คุม modal ด้วย state อยู่แล้ว ถ้าใช้ JS ของ Bootstrap จะมีสองฝ่ายคุม DOM เดียวกัน และต้องโหลดฝั่ง client เพิ่ม
- คอมโพเนนต์ที่ใช้: `navbar` (+ `navbar-expand-lg`, `dropdown-menu`), `container-fluid`, `card`, `table` (`table-bordered table-striped table-hover table-sm align-middle`, หัวตาราง `table-light`), `table-responsive`,
  `form-control`/`form-select`/`form-label`, `input-group`, `btn` (`btn-primary` = ค้นหา/บันทึก/เพิ่ม, `btn-outline-secondary` = ยกเลิก/ล้าง/ปุ่มรอง), ปุ่มแบ่งหน้า `btn btn-sm` (หน้าปัจจุบัน `btn-primary` อื่นๆ `btn-outline-primary` — ไม่ใช้ `.page-link` เพราะปุ่มหน้าปัจจุบัน `disabled` อยู่แล้ว และ `.page-link` ไม่มีสไตล์ `:disabled`), `modal` (`modal d-block` + `modal-dialog` + `modal-content`), `alert-danger` สำหรับ error, `badge` สำหรับทิศทางเรียง
- ธีม: สีหลัก Bootstrap default (`primary`), แถบเมนูบนสีเข้ม `bg-primary` + `data-bs-theme="dark"`, พื้นหลังหน้า `bg-body-tertiary`; บังคับโหมดสว่าง (`data-bs-theme="light"` ที่ `<html>`) เหมือนเดิมที่พื้นหลังสว่างเสมอ
- ไอคอน: **คง `lucide-react`** (ใช้อยู่แล้ว, import ทีละไอคอน, ไม่ต้องโหลดฟอนต์ไอคอนทั้งชุด) ไม่เพิ่ม bootstrap-icons; ปุ่มที่ใช้อีโมจิ (🔍 ✏️ 🗑) คงไว้
- Responsive: เมนูบนพับเป็นปุ่ม hamburger ที่ < 992px (`navbar-expand-lg`); แถวตัวกรองใช้ grid `row g-2` + `col-12 col-sm-6 col-lg-*`; modal เต็มจอบนมือถือ (`modal-fullscreen-sm-down`)
- CSS ที่ยังเขียนเอง ให้เหลือเฉพาะสิ่งที่ Bootstrap ไม่มี: ความสูงแท่งกราฟ (`/charts/inout`), รูปแบบสลิปตอนพิมพ์ (`@media print`), ความกว้างขั้นต่ำของตารางรายงานกว้าง
- `PasswordInput` ใช้ `input-group` + ปุ่ม `btn btn-outline-secondary` ข้างช่อง; พฤติกรรมเดิมทั้งหมด (เริ่มซ่อน, `type="button"`, `aria-label`/`aria-pressed`, ซ่อนกลับเมื่อ form submit/reset และเมื่อ `concealKey` เปลี่ยน) ต้องคงไว้ — เทสต์ `tests/password-input.test.mjs`

### Edge cases
- **ตารางรายงานกว้าง** (12+ คอลัมน์, ภาษี, สรุปฎีกา): ห่อด้วย `table-responsive` ให้เลื่อนแนวนอนในกรอบ ไม่ให้ทั้งหน้าเลื่อน; ตัวเลขเงินชิดขวา `text-end text-nowrap`
- **หน้าสลิป/พิมพ์** (`/officers/paydirect/[payid]`, payperson): เมนู/ปุ่ม/footer ต้องไม่ออกตอนพิมพ์ (`d-print-none`), สลิปกว้างคงที่ไม่ยืดตามจอ
- **export Excel/KTB**: ลิงก์/ปุ่มดาวน์โหลดยังชี้ API เดิม เปลี่ยนแค่ class
- **ผู้ใช้ทั่วไป (status user)**: เมนูยังว่างเหมือนเดิม (แสดงแค่ชื่อระบบ + ปุ่ม Logout) — ห้ามเปลี่ยนเงื่อนไขซ่อนเมนู
- **modal ซ้อน/ยาว**: เนื้อหา modal ยาวเกินจอต้องเลื่อนได้ (`.modal` มี `overflow-y:auto`)
- **ปุ่ม disabled ระหว่างโหลด**: คง `disabled={loading}` เดิม Bootstrap แสดงจางให้เอง
- **ภาษาไทย**: ฟอนต์ระบบของ Bootstrap (system-ui) แสดงไทยได้ ไม่โหลดฟอนต์ภายนอก

### 11.1 แบ่งหน้ามาตรฐานทุกหน้า (TASK_BOARD #12)
- ทุกหน้าที่แสดงรายการแบบแบ่งหน้าใช้คอมโพเนนต์เดียว `src/components/Pagination.tsx`: Bootstrap `.pagination` (`page-item`/`page-link`) มีปุ่ม หน้าแรก « / ก่อนหน้า ‹ / เลขหน้ารอบหน้าปัจจุบัน ±2 พร้อม … และหน้าแรก-หน้าสุดท้าย / ถัดไป › / หน้าสุดท้าย », ข้อความ "รายการที่ a–b จาก N" และ select **"แสดง [5|10|15|50|100] รายการต่อหน้า"**
- เปลี่ยนจำนวนต่อหน้า → กลับไปหน้า 1 และโหลดใหม่ด้วยตัวกรองเดิม
- ค่าเริ่มต้นต่อหน้า: คงค่าเดิมของหน้าถ้าอยู่ในตัวเลือก (10 หรือ 50); ค่าเดิมที่ไม่อยู่ในตัวเลือกใช้ตัวเลือกที่ใกล้ที่สุด (useronline 20 → 15, taxtitle 90 → 100)
- API ที่เคยจำกัด 50 แถวต่อหน้า เพิ่มเป็น 100 (`MAX_PAGE_SIZE` ใน `src/lib/pagination.ts`) เพื่อให้ตัวเลือก 100 ได้จริง; API ที่จำกัดสูงกว่านี้อยู่แล้ว (export KTB/ใบสำคัญจ่าย 5000, taxtitle/taxtmonth 200, salaries/cheques 1000) คงเดิม
- Edge cases
  - ไม่มีข้อมูล (total 0): ไม่แสดงปุ่มหน้า แต่ยังแสดงตัวเลือกจำนวนต่อหน้า
  - หน้าเดียว: ปุ่มก่อนหน้า/ถัดไปเป็น disabled
  - ระหว่างโหลด: ปุ่มและ select disabled (กันกดซ้ำ)
  - ค่า pageSize แปลก/เกินจาก URL หรือ client อื่น: API ตัดให้อยู่ใน 1..100 (หรือเพดานเดิมที่สูงกว่า)
  - **ค้นหาฎีกา (`/reports/deegars`) และค้นหาเช็ค (`/reports/cheques`)**: เดิมขอ 1000 แถวแล้วรวมยอดฝั่งเบราว์เซอร์ แต่ API ฎีกาตัดเหลือ 50 แถว → ยอดรวมผิดเมื่อผลค้นหาเกิน 50 แถว; ทำเป็นแบ่งหน้าและให้ API ส่ง **ยอดรวมของผลค้นหาทั้งหมด** (`totals`) มาด้วย ใช้แสดงแถว Total แทนการรวมเฉพาะแถวที่โหลด
  - **หนังสือรับรองภาษีรายกลุ่ม (`/reports/taxdept/group`)**: เดิมไม่ส่ง pageSize จึงได้แค่ 10 แถวแรก → ใช้ตัวแบ่งหน้าเดียวกัน
  - หน้าส่งกรุงไทย (ฎีกา/เช็ค) และสรุปภาษี (กลุ่ม): เดิมโหลด 50 แถวแรกโดยไม่มีปุ่มไปหน้าถัดไป → เพิ่มตัวแบ่งหน้า (ปุ่ม export Excel ยังส่งออกทั้งหมดตามเดิม)

### 11.2 ตัวเลขจำนวนเงินชิดขวาทุกหน้า (TASK_BOARD #13)
- ช่องตาราง (`td`/`th`) ที่แสดงจำนวนเงิน (ผ่าน `formatMoney`/`formatNumber`/`formatBaht`/`toLocaleString`) ใช้ `text-end text-nowrap` — ตัวเลขชิดขวาให้หลักตรงกัน และไม่ตัดบรรทัดกลางตัวเลข
- รวมแถวรวม (tfoot) และตารางรายละเอียดใน modal; หัวคอลัมน์คงจัดกลางตามเดิม
- เดิมหลายหน้าจัดกลาง (`text-center`) หรือชิดซ้าย (ไม่มี class) — เทสต์ `tests/bootstrap-ui.test.mjs` กันไม่ให้กลับไปเป็นแบบเดิม

### 10.2 ประวัติจ่ายตรงรายคนช้า (`/officers/[cid]/paydirect`) — TASK_BOARD #14
- อาการ: เปิดหน้า HTML มาเร็ว (TTFB ~10 ms) แต่รอข้อมูล ~0.5 s บนเครื่อง local ทุกครั้ง — เวลาทั้งหมดอยู่ที่ `GET /api/officers/[cid]/paydirect`
- ต้นเหตุ (EXPLAIN บน DB local): `paydirect` มี 564,977 แถว index มีแค่ PK `ID` และ unique `key (A, B, C)` = ปี, เดือน, CID — ค้นด้วย CID อย่างเดียวใช้ index ไม่ได้ จึงอ่านทั้งตาราง 564,977 แถว (`type=index`) ทั้งใน query รายการและ query นับจำนวน (2 รอบต่อการเปิดหน้า) ทั้งที่คนหนึ่งมีแค่ ~145 แถว
  ตาราง/การ join อื่น (officer, station, cmonth) เป็น `const`/`eq_ref` อยู่แล้ว
- ผลกระทบ: ทุกที่ที่กรอง paydirect ด้วย CID — หน้าประวัติจ่ายตรงรายคน, "My PayDirect" ของผู้ใช้ทั่วไป (`buildPaydirectAccessClause` ใช้ `paydirect.C = ?`) และสลิป
- แก้: เพิ่ม index `idx_paydirect_cid (C, A, B)` ด้วย `prisma/sql/2026-11-25_paydirect_cid_index.sql` + `@@index` ใน `prisma/schema.prisma` — ไม่แก้ query/ผลลัพธ์
  (C ขึ้นก่อนเพื่อค้นตามคน, A, B ต่อท้ายให้ GROUP BY ปี/เดือน อ่านจาก index ได้)
- Edge cases: ตาราง MyISAM ล็อกระหว่างสร้าง index → รันช่วงไม่มีคนนำเข้าข้อมูล; script รันซ้ำได้ (`IF NOT EXISTS`); การนำเข้า paydirect (`INSERT IGNORE`) ช้าลงเล็กน้อยเพราะต้องอัปเดต index เพิ่ม 1 ตัว
- **ต้องรัน SQL บน DB ของ server** (เหมือนงาน #10) ไม่งั้นบน server ยังช้าเหมือนเดิม

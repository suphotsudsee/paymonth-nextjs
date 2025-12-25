ThaiID Login Bundle
===================

คัดไฟล์สำคัญทั้งหมดสำหรับ ThaiID (DOPA Digital ID) login/jwt session ออกจากโปรเจ็กเดิม เพื่อนำไปใช้ในโปรเจ็กใหม่ที่ใช้ Next.js App Router

ไฟล์ที่รวมไว้ (คง path เดิม)
-----------------------------
- `src/auth.ts`
- `src/lib/auth.ts`
- `src/lib/prisma.ts`
- `src/middleware.ts`
- `src/app/callback/route.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/auth/thaiid-login/route.ts`
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/captcha/route.ts`
- `public/ThaID_banner.jpg`

Dependencies ที่ต้องมีในโปรเจ็กใหม่
-------------------------------------
- `next`, `react`
- `next-auth`
- `jose`
- `@prisma/client`, `prisma`
- (มีใช้งาน `crypto` built-in, และ `jsonwebtoken` หากต้องการคง package.json ตามโปรเจ็กนี้)

Environment variables ที่ต้องตั้ง
----------------------------------
- `AUTH_SECRET` (ใช้ sign JWT session ใน `src/lib/auth.ts`)
- `AUTH_THAIID_ID`
- `AUTH_THAIID_SECRET`
- `AUTH_THAIID_SCOPE` (เช่น `pid`)
- `AUTH_THAIID_AUTH_URL` (default: https://imauth.bora.dopa.go.th/api/v2/oauth2/auth)
- `AUTH_THAIID_TOKEN_URL` (default: https://imauth.bora.dopa.go.th/api/v2/oauth2/token)
- `AUTH_THAIID_USERINFO_URL` (default: https://imauth.bora.dopa.go.th/api/v2/oauth2/userinfo)
- `AUTH_THAIID_CALLBACK` (เช่น `https://your-host/callback`)
- `AUTH_THAIID_API_KEY` (ถ้าฝั่ง ThaiID ต้องการ)
- `NEXTAUTH_URL` (base URL ของระบบ)
- ตัวเลือก fallback ที่โค้ดรองรับ: `THAID_CLIENT_ID`, `THAID_CLIENT_SECRET`, `THAID_API_TOKEN`, `THAID_SCOPE`, `THAID_API_KEY`
- Prisma/DB: `DATABASE_URL` (หรือค่าที่ใช้กับ Prisma client)

โครงสร้างฐานข้อมูลที่ต้องมี
-----------------------------
ตาราง `user` อย่างน้อยต้องมีคอลัมน์ `id`, `cid`, `username`, `password` (sha1), `fname`, `lname`, `status`, `accessLevel` เพราะ callback และ thaiid-login ใช้ query จากตารางนี้

วิธีนำไปใช้ในโปรเจ็กใหม่ (สรุป)
----------------------------------
1) คัดลอกโฟลเดอร์ `src` และ `public` จาก bundle นี้ทับลงโครงสร้างโปรเจ็กใหม่ (App Router)
2) เพิ่ม dependencies ตามรายการด้านบนลง `package.json` แล้วรัน `npm install`
3) ตั้งค่า `.env` ด้วยตัวแปรทั้งหมด (ปรับ `AUTH_THAIID_CALLBACK` ให้ตรง domain ใหม่)
4) ตรวจ `src/app/(auth)/login/page.tsx` — เปลี่ยน `client_id` ใน `startThaiIdLogin` ให้ดึงจาก env/config โปรเจ็กใหม่แทนค่าฮาร์ดโค้ด (หรือให้ตรง client ของโปรเจ็กใหม่)
5) ตรวจ `src/middleware.ts` — ปรับ `PROTECTED_PATHS` ให้ครอบคลุม path ที่ต้องการกันในโปรเจ็กใหม่
6) Prisma: เชื่อมต่อ DB (`DATABASE_URL`) และ ensure ตาราง `user` พร้อมข้อมูล
7) ทดสอบ flow:
   - เข้า `/login` → กด “Login with ThaiID” → ยืนยัน ThaiID → กลับ `/callback` → ได้ session cookie `session`
   - เรียก `/api/auth/me` ต้องได้ข้อมูล user, ถ้าไม่ login ต้องได้ 401
   - ตรวจ redirect ของ middleware ตามสิทธิ์ user

หมายเหตุเพิ่มเติม
-----------------
- `src/auth.ts` ใช้ NextAuth v5 beta และตั้งค่า provider ThaiID (OAuth2) พร้อม profile mapping → jwt callbacks ใส่ `citizenId` ใน token/session
- `src/app/callback/route.ts` แลก code เป็น token ด้วย Basic auth (clientId/secret) รองรับ retry ถ้า token URL ต้องการ trailing slash
- `src/lib/auth.ts` ใช้ `AUTH_SECRET` ทำ HMAC + JWT, มี utility captcha (HMAC-based) ที่ใช้ใน `api/auth/captcha`
- asset ปุ่ม ThaiID อยู่ที่ `public/ThaID_banner.jpg`


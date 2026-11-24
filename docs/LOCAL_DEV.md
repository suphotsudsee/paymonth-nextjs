# รันบนเครื่อง (local) ด้วยฐานข้อมูลจริงที่ dump มา

## ส่วนประกอบ
| ส่วน | ค่า |
|------|-----|
| DB | MariaDB 10.11 ใน Docker (`docker-compose.local.yml`), container `paymonth-local-db`, `127.0.0.1:3310`, schema `test-paymonth` |
| รหัส DB + บัญชีทดสอบ | `.env.db.local` (ไม่ commit) |
| แอป | `npm run dev` → http://localhost:9102 (`.env` ชี้ `DATABASE_URL` มาที่ 3310; ค่าเดิมอยู่ใน `.env.backup-before-localdb`) |
| บัญชีทดสอบ (มีเฉพาะ DB local) | `localadmin` (status admin, accessLevel 9) และ `localuser` (status user, accessLevel 0, ผูกกับ CID ใน `LOCAL_TEST_USER_CID`; `LOCAL_TEST_USER_PERIOD`=งวด YYYY/MM (พ.ศ.) ที่ CID นี้มีแถวใน `salary` — ใช้ใน smoke test) |

พอร์ต 3310 เพราะ 3306 = XAMPP, 33066/33067 = container ams-*

## เริ่ม/หยุด
```powershell
docker compose -f docker-compose.local.yml --env-file .env.db.local up -d
docker compose -f docker-compose.local.yml --env-file .env.db.local stop
```

## โหลด dump ใหม่ (เช่น ได้ไฟล์ใหม่จาก server)
```bash
export MYSQL_PWD="$(grep ^LOCAL_DB_ROOT_PASSWORD .env.db.local | cut -d= -f2-)"
docker exec -i -e MYSQL_PWD paymonth-local-db mariadb -uroot --default-character-set=utf8mb4 test-paymonth < test-paymonth.sql
# dump มีรหัสผ่านเก่าใน useronline — ล้างทันที
docker exec -i -e MYSQL_PWD paymonth-local-db mariadb -uroot test-paymonth < prisma/sql/2026-11-23_clear_useronline_passwords.sql
```
dump เป็น `DROP TABLE` + สร้างใหม่ → บัญชี `localadmin`/`localuser` หายไปด้วย ต้องสร้างใหม่ (password เก็บเป็น `sha1`) และตรวจว่า `LOCAL_TEST_USER_CID` ยังมีข้อมูลในงวด `LOCAL_TEST_USER_PERIOD`

## ทดสอบ
```powershell
npm test                          # unit test (ไม่ต้องใช้ DB)
node scripts/local-smoke.mjs      # ยิง API จริงที่ dev server: login, สิทธิ์ USER/ADMIN, IDOR, /api/users ไม่ส่ง hash
```

## ข้อควรระวัง
- `test-paymonth.sql` = ข้อมูลบุคคลจริง (เลขบัตร เงินเดือน บัญชีธนาคาร) และมีรหัสผ่านที่ผู้ใช้เคยพิมพ์ใน `useronline` 14,659 แถว
  — `.gitignore` กันไว้แล้ว (`/*.sql`) ใช้เสร็จควรลบไฟล์ออกจากเครื่อง

## ก่อน deploy ไป test-paymonth.phoubon.in.th
ขั้นตอนเต็ม (สำรอง, จัดการไฟล์ค้างบน server, SQL, ตรวจหลัง deploy, ย้อนกลับ): `docs/DEPLOY.md`

1. `.env` บน server: `DATABASE_URL` ชี้ DB ของ server, `NEXTAUTH_URL=https://test-paymonth.phoubon.in.th`,
   `AUTH_SECRET` ค่าสุ่มใหม่ ≥ 32 ไบต์ (ห้ามใช้ค่าเดียวกับเครื่องนี้) — แอปจะไม่ออก session ถ้าไม่ตั้ง (งาน #4)
2. `AUTH_THAIID_CALLBACK=https://test-paymonth.phoubon.in.th/callback` และต้องตรงกับที่ลงทะเบียนกับ DOPA
3. รัน `prisma/sql/2026-11-23_clear_useronline_passwords.sql` บน DB ของ server (งาน #3) — DB ที่ dump มายังมีรหัสผ่านอยู่
4. ตรวจบัญชีเจ้าหน้าที่ที่ status ว่าง/ไม่รู้จัก + accessLevel 0 — จะดูข้อมูลคนอื่นไม่ได้แล้ว (งาน #2)
5. ห้ามสร้าง `localadmin`/`localuser` บน server
6. `npm ci && npm run build && pm2 restart` แล้วรัน `node scripts/local-smoke.mjs` ไม่ได้ (ล็อกไว้เฉพาะ localhost) — ทดสอบมือด้วยบัญชีจริง

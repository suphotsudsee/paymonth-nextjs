# Deploy ไป test-paymonth.phoubon.in.th

คู่มือสำหรับคนที่เข้า server ได้ (ssh) — เขียนเมื่อ 2026-11-24 หลัง commit `aab74a3` (งาน #11–#14)

## สภาพตอนนี้
| รายการ | ค่า |
|-------|-----|
| โฟลเดอร์แอปบน server | `/home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th` |
| process | PM2 ชื่อ `paymonth-nextjs` (`npm start` → `next start -p 9102`) |
| deploy อัตโนมัติ | `.github/workflows/deploy.yml` (runner self-hosted บน server): push เข้า `main` → `git pull` → `npm ci` → `npx prisma generate` → `npm run build` → `pm2 restart` |
| โค้ดบน server | ค้างที่ `a93a5b1` — deploy 3 ครั้งล่าสุดล้มที่ `git pull` เพราะมีไฟล์ถูกแก้ค้างบน server 8 ไฟล์ (ดูขั้น 2) |
| โค้ดล่าสุดใน GitHub | `aab74a3` |

ขั้นที่ **ต้องทำก่อน** ให้ deploy อัตโนมัติผ่าน: ขั้น 1–3. ขั้น 5 (SQL) workflow ไม่ทำให้ — ถ้าไม่รัน หน้ารายงานและประวัติจ่ายตรงบน server จะยังช้า และรหัสผ่านเก่าใน `useronline` ยังค้างอยู่

---

## 1. สำรองก่อนแตะอะไร
ทำในช่วงปิดปรับปรุง (แจ้งผู้ใช้ก่อน) — ขั้น 1.2 ล็อกทุกตารางไม่ให้เขียนระหว่าง dump
```bash
cd /home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th
umask 077                          # ไฟล์สำรองมีรหัส DB และข้อมูลเงินเดือน — ให้อ่านได้เฉพาะเจ้าของ
set -o pipefail                    # ให้ไปป์ mysqldump | gzip ล้มถ้า mysqldump ล้ม
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p -m 700 ~/paymonth-backup/$STAMP

# 1.1 โค้ดที่แก้ค้างบน server (ใช้ในขั้น 2)
git status --short                 > ~/paymonth-backup/$STAMP/git-status.txt
git diff HEAD                      > ~/paymonth-backup/$STAMP/server-changes.patch   # HEAD = รวมที่ staged ไว้ด้วย
git rev-parse HEAD                 > ~/paymonth-backup/$STAMP/old-commit.txt   # ควรได้ a93a5b1...
cp .env ~/paymonth-backup/$STAMP/env.backup                                  # ไฟล์ลับ ห้ามส่งต่อ

# 1.2 ฐานข้อมูล — อ่านชื่อ DB/user/host จาก DATABASE_URL ใน .env (mysql://USER:PASS@HOST:PORT/DBNAME)
#     -p ให้พิมพ์รหัสเอง อย่าใส่รหัสในคำสั่ง (จะติดอยู่ใน history)
#     ตารางเป็น MyISAM: --single-transaction ไม่ได้ snapshot ที่สอดคล้องกัน จึงใช้ --lock-all-tables (ล็อกการเขียนทั้ง DB ระหว่าง dump)
mysqldump -h HOST -P PORT -u USER -p --lock-all-tables --routines DBNAME   | gzip > ~/paymonth-backup/$STAMP/db.sql.gz   && echo "DUMP OK" || echo "DUMP FAILED — หยุด อย่าทำขั้นต่อไป"

# 1.3 ตรวจว่าไฟล์สำรองใช้ได้ (ต้องผ่านทั้งสองบรรทัด)
gzip -t ~/paymonth-backup/$STAMP/db.sql.gz && echo "gzip OK"
zcat ~/paymonth-backup/$STAMP/db.sql.gz | tail -n 1      # ต้องเห็น "-- Dump completed on ..."
ls -l ~/paymonth-backup/$STAMP/                           # สิทธิ์ต้องเป็น -rw------- (และโฟลเดอร์ drwx------)
```
ถ้าไม่เห็น `DUMP OK`, `gzip OK` และ `-- Dump completed` ครบ **อย่าทำขั้นต่อไป**
`db.sql.gz` และ `env.backup` มีข้อมูลบุคคลจริงและรหัสลับ — เก็บไว้บน server เท่านั้น ลบเมื่อ deploy เสร็จและใช้งานได้แล้ว

## 2. จัดการไฟล์ที่แก้ค้างบน server
ไฟล์ที่ทำให้ `git pull` ล้ม (จาก log ของ GitHub Actions run 45351428238):
```
src/app/(dashboard)/reports/deegars/page.tsx
src/app/(dashboard)/reports/payvouchers/page.module.css
src/app/(dashboard)/reports/payvouchers/page.tsx
src/app/(dashboard)/reports/summarydeegar/[pnumber]/[nodeegar]/page.tsx
src/app/api/deegars/route.ts
src/app/api/reports/ktbcheque/export/route.ts
src/app/api/reports/ktbdeegar/export/route.ts
src/app/api/salaries/deegars/route.ts
```
ไฟล์เหล่านี้ใน repo ถูกแก้ไปมากแล้ว (Bootstrap, แบ่งหน้า, index รายงาน) — การแก้บน server ส่วนใหญ่น่าจะเป็นของเก่าที่ repo ทำแทนแล้ว **แต่ต้องดูก่อนทิ้ง**:
```bash
less ~/paymonth-backup/$STAMP/server-changes.patch
```
- **ถ้าเป็นการแก้ทดลอง/ชั่วคราว หรือมีใน repo แล้ว** → ทิ้งได้ (มีสำรองใน `server-changes.patch` แล้ว)
- **ถ้าเป็นการแก้ที่ยังต้องใช้และไม่มีใน repo** → ส่ง `server-changes.patch` ให้คนดูแลโค้ดใส่เข้า repo ก่อน แล้วค่อยทำขั้นนี้
  - ระวังเป็นพิเศษ: `ktbcheque/export` และ `ktbdeegar/export` — ถ้าเป็นการแก้ JOIN บัญชีธนาคารให้ใช้ `salary.BANKID` (PRD 8.7 / TASK_BOARD #5 ยังไม่ได้ทำใน repo) ห้ามทิ้งโดยไม่ย้ายเข้า repo เพราะไฟล์ส่งกรุงไทยจะกลับไปมียอดซ้ำ

ทิ้งการแก้บน server (หลังสำรองและตัดสินใจแล้ว) — คืนทั้งไฟล์ที่ staged และยังไม่ staged ให้ตรงกับ commit ปัจจุบัน:
```bash
# reset จะทำก็ต่อเมื่อมี patch สำรองที่ไม่ว่าง (ไม่งั้นหยุดและไม่ทิ้งอะไร)
test -s ~/paymonth-backup/$STAMP/server-changes.patch   && git reset --hard HEAD   && echo "RESET OK" || echo "ไม่มี patch สำรอง (หรือว่าง) — ไม่ได้ reset; กลับไปทำขั้น 1.1"
# git reset --hard HEAD = ทิ้งการแก้ที่ track ไว้ทั้งหมด ทั้ง staged/ไม่ staged (ไม่แตะไฟล์ untracked เช่น .env)
git status --short          # ต้องไม่เหลือบรรทัดที่ขึ้นต้นด้วย M / A / D (เหลือได้แค่ ??)
```
ไฟล์ untracked (`??`) ไม่ขวาง `git pull` ยกเว้นชื่อชนกับไฟล์ใหม่ใน repo — ถ้า pull ฟ้องชื่อไฟล์ untracked ให้ย้ายไฟล์นั้นไปไว้ใน `~/paymonth-backup/$STAMP/` ก่อน

## 3. ตรวจ `.env` บน server
โค้ดตั้งแต่งาน #4 **ไม่ออก session ถ้า `AUTH_SECRET` ไม่ถูกต้อง** (login ไม่ได้ทั้งระบบ):
- ต้องยาว ≥ 32 ไบต์ และห้ามเป็นค่า fallback เก่าที่เคยฝังในโค้ด (`src/lib/authSecret.ts` ปฏิเสธเอง)
- สร้างค่าใหม่ (ห้ามใช้ค่าเดียวกับเครื่องพัฒนา):
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  แก้ใน `.env` เป็น `AUTH_SECRET=<ค่าที่ได้>` — ผู้ใช้ที่ login ค้างอยู่จะต้อง login ใหม่ (session เดิมใช้ไม่ได้)

ค่าอื่นที่ต้องมี:
| ตัวแปร | ค่า |
|-------|-----|
| `DATABASE_URL` | ชี้ DB ของ server |
| `NEXTAUTH_URL` | `https://test-paymonth.phoubon.in.th` |
| `AUTH_THAIID_CALLBACK` | `https://test-paymonth.phoubon.in.th/callback` (ต้องตรงกับที่ลงทะเบียนกับ DOPA) |
| `AUTH_THAIID_*` อื่นๆ | ตามเดิม |

ห้ามสร้างบัญชี `localadmin` / `localuser` บน server (มีไว้เฉพาะ DB ในเครื่อง)

## 4. Deploy โค้ด
**ทางที่ 1 (แนะนำ) — ให้ GitHub Actions ทำ:** หลังทำขั้น 2 แล้ว เปิด GitHub → Actions → run ล่าสุดของ "Deploy paymonth-nextjs on self-hosted server" → **Re-run jobs**
(หรือ `gh run rerun 45351428238 --repo suphotsudsee/paymonth-nextjs` จากเครื่องที่ login `gh` ไว้)

**ทางที่ 2 — ทำมือบน server** (ลำดับเดียวกับ workflow; ทุกขั้นต่อด้วย `&&` จึงหยุดทันทีที่ขั้นไหนล้ม และไม่ restart ถ้า build ไม่ผ่าน):
```bash
cd /home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th   && git pull --ff-only origin main   && git log --oneline -1   && npm ci   && npx prisma generate   && npm run build   && pm2 restart paymonth-nextjs   && pm2 save   && echo "DEPLOY OK" || echo "DEPLOY FAILED — ดู error ด้านบน (ถ้าล้มที่ build ให้ทำขั้น 7)"
```
- `git pull --ff-only`: ถ้ามีไฟล์ค้าง (ขั้น 2 ยังไม่เสร็จ) หรือประวัติแยกกัน จะหยุดเลย ไม่สร้าง merge commit บน server; `git log` ต้องขึ้น `aab74a3` หรือใหม่กว่า
- `npm ci` ติดตั้ง dependency ใหม่ (bootstrap 5.3) ตาม `package-lock.json`; `npm run build` ต้องจบด้วย ✓ Compiled successfully

ถ้า `npm run build` ล้ม: `next build` ล้างโฟลเดอร์ `.next` ตั้งแต่เริ่ม build (`cleanDistDir`) แอปที่รันอยู่จึงอาจเปิดบางหน้าไม่ได้แล้ว → **ย้อนกลับตามขั้น 7 ทันที** แล้วส่ง log ของ build ให้คนดูแลโค้ด

## 5. รัน SQL บน DB ของ server (workflow ไม่รันให้)
รันช่วงไม่มีคนใช้ (ตาราง MyISAM ถูกล็อกระหว่างสร้าง index — บนเครื่อง local แต่ละ index ใช้ไม่กี่วินาที) ทุกไฟล์รันซ้ำได้
```bash
cd /home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th
# ไฟล์มากับ git pull ในขั้น 4 (อยู่ใน prisma/sql/)
mysql -h HOST -P PORT -u USER -p DBNAME < prisma/sql/2026-11-23_clear_useronline_passwords.sql
mysql -h HOST -P PORT -u USER -p DBNAME < prisma/sql/2026-11-24_report_indexes.sql
mysql -h HOST -P PORT -u USER -p DBNAME < prisma/sql/2026-11-25_paydirect_cid_index.sql
```
| ไฟล์ | ทำอะไร | ถ้าไม่รัน |
|------|-------|----------|
| `2026-11-23_clear_useronline_passwords.sql` | `UPDATE useronline SET password = NULL` — ล้างรหัสผ่านที่ระบบเก่าเคยบันทึกตอน login (แสดงจำนวนแถวก่อน/หลัง; แก้ข้อมูล ย้อนไม่ได้ — มีสำรองในขั้น 1.2) | รหัสผ่านที่ผู้ใช้เคยพิมพ์ยังค้างอยู่ใน DB |
| `2026-11-24_report_indexes.sql` | ตรวจข้อมูลก่อน แล้วเพิ่ม index 5 ตัวสำหรับเมนูรายงาน — ถ้าขั้นตรวจฟ้อง `CONSTRAINT ... failed` จะหยุดเองไม่สร้าง index → แจ้งคนดูแลโค้ด อย่าแก้ข้อมูลเอง | เมนูรายงานช้า |
| `2026-11-25_paydirect_cid_index.sql` | เพิ่ม index `idx_paydirect_cid (C, A, B)` | หน้าประวัติจ่ายตรงรายคน / My PayDirect ช้า (~0.5 วินาทีขึ้นไปต่อครั้ง) |

ท้ายไฟล์ index ทั้งสองมี `SELECT` แสดงรายการ index — ต้องเห็น `idx_paydirect_cid = C,A,B` และ index รายงานครบ 5 ตัว

## 6. ตรวจหลัง deploy
```bash
pm2 status paymonth-nextjs                 # online, restart count ไม่วิ่งขึ้นเรื่อยๆ
pm2 logs paymonth-nextjs --lines 50        # ต้องไม่มี "AUTH_SECRET ..." error หรือ Prisma error
git log --oneline -1                       # aab74a3 (หรือใหม่กว่า)
curl -sI http://127.0.0.1:9102/login | head -1    # HTTP/1.1 200
```
ทดสอบในเบราว์เซอร์ด้วยบัญชีจริง (สคริปต์ `scripts/local-smoke.mjs` ใช้บน server ไม่ได้ — ล็อกไว้เฉพาะ localhost):
- [ ] หน้า login เป็นหน้าตา Bootstrap (การ์ดสีขาวกลางจอ) ปุ่มรูปตาแสดง/ซ่อนรหัสผ่านใช้ได้ และ login ผ่าน (ทั้ง username/password และ ThaiID)
- [ ] เจ้าหน้าที่/admin: เมนูบนครบ, `/officers` แสดงรายชื่อและแถบแบ่งหน้า "แสดง [10] รายการต่อหน้า" เปลี่ยนเป็น 100 ได้
- [ ] ผู้ใช้ทั่วไป (status `user`): ไม่เห็นเมนู เปิดได้เฉพาะหน้าของตัวเอง ดูสลิปของตัวเองได้ เปิด CID คนอื่นไม่ได้
- [ ] รายงาน: สรุปฎีกา, ค้นหาฎีกา, สรุปภาษี — ตัวเลขเงินชิดขวา, ค้นหาฎีกาที่มีเกิน 50 แถวเห็นครบและยอด Total ถูก
- [ ] ประวัติจ่ายตรงรายคน (`/officers/<CID>/paydirect`) ขึ้นเร็ว (หลังรัน SQL ขั้น 5)
- [ ] สลิปจ่ายตรง A4: สั่งพิมพ์ (Ctrl+P) แล้วไม่มีเมนู/footer/แถบแบ่งหน้าในหน้าพิมพ์ — **ยังไม่เคยตรวจด้วยการพิมพ์จริง**
- [ ] ส่งกรุงไทย: ปุ่ม export Excel ยังได้ไฟล์ครบทุกแถว

## 7. ถ้าต้องย้อนกลับ
```bash
cd /home/phoubon-test-paymonth/htdocs/test-paymonth.phoubon.in.th   && git checkout a93a5b1   && npm ci   && npx prisma generate   && npm run build   && pm2 restart paymonth-nextjs   && echo "ROLLBACK OK" || echo "ROLLBACK FAILED — ดู error ด้านบน"
```
(`a93a5b1` = ค่าใน `~/paymonth-backup/<STAMP>/old-commit.txt`; หลัง checkout จะอยู่ในสถานะ detached HEAD)
- โค้ดเก่า (`a93a5b1`) **ก่อนงาน #4 มี AUTH_SECRET fallback ฝังในโค้ด** — ย้อนแล้วรีบแก้แล้ว deploy ใหม่ อย่าค้างไว้
- index ที่เพิ่มไม่ทำให้โค้ดเก่าพัง ไม่ต้องลบ; ถ้าจะลบ: `DROP INDEX idx_paydirect_cid ON paydirect;` (รายชื่อ index รายงานอยู่ในหัวไฟล์ `2026-11-24_report_indexes.sql`)
- การล้างรหัสผ่านใน `useronline` ย้อนไม่ได้ (และไม่ควรย้อน) — ถ้าจำเป็นจริงใช้ `db.sql.gz` จากขั้น 1.2
- กลับมาใช้ deploy อัตโนมัติ: `git checkout main` แล้วให้ `git status` สะอาด

# Task Board

| # | งาน | สถานะ | หลักฐาน (test output / Codex review) |
|---|-----|-------|--------------------------------------|
| 0 | ติดตั้ง pstack (CLAUDE.md, Stop hook, scripts) + เขียน PRD.md จากโค้ดเดิม | เสร็จ | ไม่มีการแก้โค้ดแอป; `python scripts/cross_review.py` หลัง commit |
| 1 | [วิกฤต] ปิด/แก้ `POST /api/auth/thaiid-login` ที่ออก session จาก `pid` ใน body โดยไม่ตรวจ (PRD ข้อ 8.1) | รอ | |
| 2 | [สูง] ตรวจสิทธิ์เจ้าของข้อมูลใน API payperson และ route ที่ใช้แค่ `verifySession` (PRD 8.2–8.3) | รอ | |
| 3 | [สูง] เลิกบันทึกรหัสผ่านลง `useronline` (PRD 8.4) | รอ | |
| 4 | [สูง] บังคับตั้ง `AUTH_SECRET` (ไม่มี fallback) (PRD 8.5) | รอ | |
| 5 | [กลาง] export KTB ใช้ `salary.BANKID` แทน JOIN ตาม CID (PRD 8.7) | รอ | |
| 6 | ตั้งระบบเทสต์ของแอป (ยังไม่มีเลย) ก่อนเริ่มงาน 1–5 | รอ | |

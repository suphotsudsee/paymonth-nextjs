-- ล้างรหัสผ่านที่เคยถูกเก็บเป็นข้อความธรรมดาในตาราง useronline (PRD ข้อ 8.4, TASK_BOARD #3)
-- ตั้งแต่ commit นี้ โค้ดบันทึก password = NULL เสมอ แต่แถวเก่ายังมีรหัสที่ผู้ใช้พิมพ์ (รวมครั้งที่พิมพ์ผิด)
-- รันครั้งเดียวบน DB จริง โดยคนที่มีสิทธิ์ — ย้อนกลับไม่ได้ (นั่นคือจุดประสงค์)
-- ก่อนรัน: ถ้ามี backup ของ DB ที่มีตารางนี้ backup นั้นก็มีรหัสผ่านอยู่ด้วย ต้องจัดการแยก

-- 1) ดูว่าจะกระทบกี่แถว
SELECT COUNT(*) AS rows_with_password FROM useronline WHERE password IS NOT NULL;

-- 2) ล้าง (คอลัมน์รับ NULL ได้: /callback บันทึก NULL มาตั้งแต่ก่อนแก้)
UPDATE useronline SET password = NULL WHERE password IS NOT NULL;

-- 3) ตรวจผล: ต้องได้ 0
SELECT COUNT(*) AS rows_with_password FROM useronline WHERE password IS NOT NULL;

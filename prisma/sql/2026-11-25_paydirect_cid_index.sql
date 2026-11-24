-- index สำหรับประวัติจ่ายตรงรายคน / สลิปของผู้ใช้ (TASK_BOARD #14, PRD ข้อ 10.2)
-- เดิม paydirect มีแค่ unique key (A, B, C) = ปี, เดือน, CID → ค้นด้วย CID อย่างเดียวต้องอ่านทั้งตาราง (DB local 564,977 แถว)
-- เพิ่ม index อย่างเดียว ไม่แก้ข้อมูล; รันซ้ำได้ (IF NOT EXISTS ต้องใช้ MariaDB 10.0+ — server/local เป็น MariaDB 10.11)
-- ตาราง MyISAM: ALTER ล็อกตารางระหว่างสร้าง index — รันช่วงไม่มีคนนำเข้าข้อมูลจ่ายตรง
-- ย้อนกลับ: DROP INDEX idx_paydirect_cid ON paydirect;

-- C ขึ้นก่อนให้ค้นตามคนได้; A, B ต่อท้ายให้ GROUP BY ปี/เดือนของคนนั้นอ่านจาก index ได้เลย
CREATE INDEX IF NOT EXISTS idx_paydirect_cid ON paydirect (C, A, B);

-- ตรวจผล: ต้องเห็น idx_paydirect_cid = C,A,B
SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'paydirect'
GROUP BY INDEX_NAME;

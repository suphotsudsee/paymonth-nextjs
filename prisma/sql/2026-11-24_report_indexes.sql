-- index สำหรับเมนูรายงาน (TASK_BOARD #10, PRD ข้อ 10.1)
-- ตรวจข้อมูล (ไม่แก้) แล้วเพิ่ม index อย่างเดียว; รันซ้ำได้ (IF NOT EXISTS ต้องใช้ MariaDB 10.0+ — server/local เป็น MariaDB 10.11)
-- ตาราง MyISAM: ALTER จะล็อกตารางระหว่างสร้าง index (salary ~330k แถว ใช้ไม่กี่วินาทีบนเครื่อง local) — ควรรันช่วงไม่มีคนใช้
-- ย้อนกลับ: DROP INDEX <ชื่อ> ON <ตาราง>; (รายชื่ออยู่ด้านล่าง)

-- 0) ตรวจก่อน — ไม่แก้ข้อมูล และหยุด script เองถ้าไม่ผ่าน
--    โค้ดรายงานจะ join แบบเร็ว (salary.PNUMBER = TRIM(deegar.PNUMBER) ไม่ TRIM ฝั่ง salary) ก็ต่อเมื่อ key ฝั่ง salary/regisdeegar
--    ไม่ขึ้นต้นด้วยเว้นวรรค — โค้ดตรวจเองตอนรัน (src/lib/keyHygiene.ts) ถ้าพบจะกลับไปใช้ TRIM ทั้งสองฝั่งแบบเดิม (ผลถูกแต่ช้า)
--    TRIM() ตัดเฉพาะเว้นวรรค และช่องว่างท้ายไม่มีผลกับ = (collation PAD SPACE) จึงตรวจแค่ "ขึ้นต้นด้วยเว้นวรรค"
--    DB local 2026-11-24: 0 แถว
--    ถ้าไม่ใช่ 0: INSERT ด้านล่าง error "CONSTRAINT ... failed" (CHECK บังคับใช้ตั้งแต่ MariaDB 10.2) และ phpMyAdmin/mysql จะหยุด ไม่สร้าง index
--    → แจ้งผู้ดูแลโค้ด อย่าแก้ข้อมูลฝั่งเดียว (join แบบ = ตรงๆ ในรายงานอื่นอาจหลุด)
DROP TEMPORARY TABLE IF EXISTS report_index_precheck;
CREATE TEMPORARY TABLE report_index_precheck (leading_space_keys INT NOT NULL, CHECK (leading_space_keys = 0));
INSERT INTO report_index_precheck (leading_space_keys)
SELECT (SELECT COUNT(*) FROM salary WHERE PNUMBER LIKE ' %' OR NODEEGAR LIKE ' %') + (SELECT COUNT(*) FROM regisdeegar WHERE PNUMBER LIKE ' %');
DROP TEMPORARY TABLE report_index_precheck;

-- salary ↔ deegar ใช้ (PNUMBER, NODEEGAR) ในรายงานฎีกา/เช็ค/KTB/ตามวันที่จ่าย
-- เดิมมีแค่ unique key ที่ขึ้นต้นด้วย CID จึง join จากฝั่งฎีกาต้องอ่านทั้งตาราง
-- ต่อท้าย DUPDATE, ID เพื่อให้ subquery "salary แถวล่าสุดของฎีกานี้" (ORDER BY DUPDATE DESC, ID DESC LIMIT 1) อ่านจาก index ได้เลย
-- วัดบน DB local: นับรายการฎีกาทั้งหมด (/api/salaries/deegars) 1,628 ms → 525 ms เทียบกับ index แค่ (PNUMBER, NODEEGAR)
CREATE INDEX IF NOT EXISTS idx_salary_pnumber_nodeegar ON salary (PNUMBER, NODEEGAR, DUPDATE, ID);

-- กรองรายงานตามปี/เดือน (รายงานทั้งหมด, ภาษี, กราฟรับ-จ่าย) และเรียงตามปี-เดือน
-- ใส่ CID, IDPAY ต่อท้ายเพื่อให้การจัดกลุ่ม CID+เดือน+ปี อ่านจาก index ได้โดยไม่ต้องเปิดแถวจริง
CREATE INDEX IF NOT EXISTS idx_salary_year_month ON salary (YEARTHAI, MONTHTHAI, CID, IDPAY);

-- cheque → deegar (รายงานตามวันที่จ่าย, ใบสำคัญจ่าย, KTB ตามเช็ค)
CREATE INDEX IF NOT EXISTS idx_deegar_cheque ON deegar (CHEQUE);

-- กรองช่วงวันที่จ่ายเช็ค (รายงานตามวันที่จ่าย, ใบสำคัญจ่าย)
CREATE INDEX IF NOT EXISTS idx_cheque_paydate ON cheque (PAYDATE);

-- บัญชีธนาคารของแต่ละคน (export KTB, รายการฎีกา) — prisma/schema.prisma ประกาศ @@index([CID]) ไว้แต่ใน DB ไม่มี
CREATE INDEX IF NOT EXISTS cid ON bank (CID);

-- ตรวจผล: ต้องเห็น index ทั้ง 5 ตัว
SELECT TABLE_NAME, INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND INDEX_NAME IN ('idx_salary_pnumber_nodeegar', 'idx_salary_year_month', 'idx_deegar_cheque', 'idx_cheque_paydate', 'cid')
GROUP BY TABLE_NAME, INDEX_NAME;

// SQL ของ "รายงานทั้งหมด" (/api/reports/all) — ยอดรวมและจำนวนต่องวด (PRD 10.3, TASK_BOARD #18)
// รวมยอดฝั่ง salary ก่อนแล้วค่อย join officer/cpay ครั้งละกลุ่ม แทนการ join ทีละแถว salary (~330,000 ครั้ง)
// CPU ของ server ช้ากว่าเครื่อง local ~4.8 เท่า งานที่ลดได้คือจำนวนครั้งที่ join
// ผลเท่าเดิมเพราะ officer.CID และ cpay.IDPAY เป็น key เดียว (PK) — เทสต์ live DB เทียบกับ SQL เดิมใน tests/report-queries.test.mjs
// ไม่มี import เพื่อให้เทสต์ import ตรงได้

export type ReportsAllFilters = {
  salary: string[]; // เงื่อนไขบนตาราง salary (alias s) เช่น "s.CID = ?"
  salaryParams: unknown[];
  officer: string[]; // เงื่อนไขบนตาราง officer (alias o) เช่น "o.NAME LIKE ?"
  officerParams: unknown[];
};

const where = (conds: string[]) => (conds.length ? `WHERE ${conds.join(" AND ")}` : "");

// จำนวนกลุ่ม (CID + เดือน + ปี) ต่องวด เรียงปีล่าสุด → เก่าสุด
// DISTINCT (ปี, เดือน, CID) อ่านจาก idx_salary_year_month ได้ทั้งหมด แล้ว join officer ครั้งละกลุ่ม
export function periodCountsSql(f: ReportsAllFilters): { sql: string; params: unknown[] } {
  return {
    sql: `
          SELECT g.YEARTHAI, g.MONTHTHAI, COUNT(*) AS n
          FROM (
            SELECT DISTINCT s.YEARTHAI, s.MONTHTHAI, s.CID
            FROM salary s
            ${where(f.salary)}
          ) g
          JOIN officer o ON o.CID = g.CID
          ${where(f.officer)}
          GROUP BY g.YEARTHAI, g.MONTHTHAI
          ORDER BY g.YEARTHAI DESC, g.MONTHTHAI DESC
        `,
    params: [...f.salaryParams, ...f.officerParams],
  };
}

// ยอดรายรับ/รายจ่ายรวมของทุกแถวตามตัวกรอง (ไม่ขึ้นกับหน้า)
// รวม MONEY ต่อ (CID, IDPAY) ก่อน แล้วแยกรายรับ/รายจ่ายด้วย cpay.PAYTYPE ระดับกลุ่ม
export function totalsSql(f: ReportsAllFilters): { sql: string; params: unknown[] } {
  return {
    sql: `
          SELECT
            SUM(IF(c.PAYTYPE = '1', t.m, 0)) AS income,
            SUM(IF(c.PAYTYPE <> '1', t.m, 0)) AS outcome
          FROM (
            SELECT s.CID, s.IDPAY, SUM(s.MONEY) AS m
            FROM salary s
            ${where(f.salary)}
            GROUP BY s.CID, s.IDPAY
          ) t
          JOIN officer o ON o.CID = t.CID
          JOIN cpay c ON c.IDPAY = t.IDPAY
          ${where(f.officer)}
        `,
    params: [...f.salaryParams, ...f.officerParams],
  };
}

// เงื่อนไขค้นหาทะเบียนคุมหลักฐานการจ่าย — ใช้ร่วมกันระหว่างหน้ารายการ (/api/reports/payvouchers)
// และส่งออก Excel (/api/reports/payvouchers/export) เพื่อให้ไฟล์ได้แถวเดียวกับที่เห็นในหน้า (PRD 12)
// ไม่มี import เพื่อให้เทสต์ import ตรงได้

// ช่องที่ค้นได้ — whitelist (ค่าอื่นจาก query string ใช้ pnumber)
export const PAYVOUCHER_FIELD_MAP: Record<string, string> = {
  pnumber: 'deegar.PNUMBER',
  cheque: 'cheque.CHEQUE',
  payname: 'cpay.PAYNAME',
  name: 'officer.NAME',
};

export const PAYVOUCHER_FROM = `
        FROM cheque
          INNER JOIN deegar ON cheque.CHEQUE = deegar.CHEQUE
          INNER JOIN salary ON deegar.PNUMBER = salary.PNUMBER AND deegar.NODEEGAR = salary.NODEEGAR
          INNER JOIN cpay ON salary.IDPAY = cpay.IDPAY
          INNER JOIN officer ON salary.CID = officer.CID`;

export function payvoucherWhere(
  start: string,
  end: string,
  fieldKey: string | null,
  term: string,
): { whereClause: string; params: string[] } {
  const filters = ['cheque.PAYDATE BETWEEN ? AND ?'];
  const params = [start, end];
  const column = Object.prototype.hasOwnProperty.call(PAYVOUCHER_FIELD_MAP, fieldKey ?? '')
    ? PAYVOUCHER_FIELD_MAP[fieldKey as string]
    : PAYVOUCHER_FIELD_MAP.pnumber;
  if (term) {
    filters.push(`${column} LIKE ?`);
    params.push(`%${term}%`);
  }
  return { whereClause: `WHERE ${filters.join(' AND ')}`, params };
}

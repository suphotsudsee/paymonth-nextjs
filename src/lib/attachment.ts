// หัว Content-Disposition สำหรับไฟล์ดาวน์โหลดที่ชื่อมีภาษาไทย (PRD 12, TASK_BOARD #16 — มาจากการแก้บน server)
// filename="..." ต้องเป็น ASCII (ตัวอักษรอื่นกลายเป็น _) ให้เบราว์เซอร์เก่าใช้; filename*=UTF-8''... (RFC 6266/5987) ให้เบราว์เซอร์ใหม่ได้ชื่อไทยจริง
// ไม่มี import เพื่อให้เทสต์ import ตรงได้
export function attachmentHeader(baseName: string, fallback: string, ext = 'xlsx'): string {
  const ascii = baseName
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]+/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/_+/g, '_')
    .trim();
  return `attachment; filename="${ascii || fallback}.${ext}"; filename*=UTF-8''${rfc5987(`${baseName}.${ext}`)}`;
}

// encodeURIComponent ไม่ escape ' ( ) * แต่ RFC 5987 (attr-char) ไม่อนุญาต → escape เพิ่ม
function rfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

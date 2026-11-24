import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { deegarFromSalaryMatch, regisdeegarMatch } from '@/lib/keyJoin';
import { deegarKeysAreTrimmed, salaryKeysAreTrimmed } from '@/lib/keyHygiene';
import { isStaff } from '@/lib/permissions';
import { clampPageSize, parsePage } from '@/lib/pagination';

// ค้นหาฎีกา (/reports/deegars): หนึ่งแถว = หนึ่งรายการเงินเดือน (salary) ในฎีกา พร้อมข้อมูลฎีกา/เช็คที่คู่กัน
// เปลี่ยนจาก "หนึ่งแถวต่อฎีกา" ตามการแก้บน server ที่ผู้ใช้ยืนยันให้เก็บ (PRD 12, TASK_BOARD #16)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pnumber = searchParams.get('pnumber')?.trim() || undefined;
    const accnumber = searchParams.get('accnumber')?.trim() || undefined;
    const accname = searchParams.get('accname')?.trim() || undefined;
    const cheque = searchParams.get('cheque')?.trim() || undefined;
    const page = parsePage(searchParams.get('page'));
    const pageSize = clampPageSize(searchParams.get('pageSize'), 10);
    const offset = (page - 1) * pageSize;

    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isStaff(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // join แบบเร็วได้ก็ต่อเมื่อ key ฝั่งที่ถูกค้นไม่ขึ้นต้นด้วยเว้นวรรค (src/lib/keyJoin.ts) — ตรวจจากข้อมูลจริงและจำผล 5 นาที
    const keysTrimmed = await salaryKeysAreTrimmed();
    const deegarTrimmed = await deegarKeysAreTrimmed();

    const filters: string[] = [];
    const params: string[] = [];

    if (pnumber) {
      filters.push('salary.PNUMBER LIKE ?');
      params.push(`%${pnumber}%`);
    }
    if (accnumber) {
      filters.push('deegar.ACCNUMBER LIKE ?');
      params.push(`%${accnumber}%`);
    }
    if (accname) {
      filters.push('deegar.ACCNAME LIKE ?');
      params.push(`%${accname}%`);
    }
    if (cheque) {
      filters.push('deegar.CHEQUE LIKE ?');
      params.push(`%${cheque}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const from = `
        FROM salary
          LEFT JOIN deegar ON ${deegarFromSalaryMatch(deegarTrimmed, "deegar", "salary")}
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.CID = salary.CID
          LEFT JOIN regisdeegar ON ${regisdeegarMatch(keysTrimmed, "regisdeegar", "salary")}
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE`;

    // นับจำนวนและยอดรวมของผลค้นหาทั้งหมด พร้อมกับดึงหน้าปัจจุบัน (ไม่ขึ้นต่อกัน) — TASK_BOARD #10, PRD 11.1
    // รายรับรวมทุกแถว; ภาษี/ค่าปรับเป็นค่าระดับฎีกา ถ้ารวมทุกแถวจะนับซ้ำเท่าจำนวนรายการในฎีกา → รวมฎีกาละครั้ง (DISTINCT deegar.ID)
    const countPromise = prisma.$queryRawUnsafe(
      `
        SELECT
          (SELECT COUNT(*) ${from} ${whereClause}) AS total,
          (SELECT COALESCE(SUM(salary.MONEY), 0) ${from} ${whereClause}) AS sumMoney,
          COALESCE(SUM(d.TAX), 0) AS sumTax,
          COALESCE(SUM(d.FEE), 0) AS sumPay
        FROM (
          SELECT DISTINCT deegar.ID, deegar.TAX, deegar.FEE
          ${from}
          ${whereClause}
        ) d
      `,
      ...params,
      ...params,
      ...params,
    ) as Promise<{ total: bigint; sumMoney: unknown; sumTax: unknown; sumPay: unknown }[]>;
    // ถ้า query หน้าปัจจุบันล้มก่อน จะไม่มีใคร await countPromise → กัน unhandled rejection (Node อาจปิด process)
    // ส่วน await countPromise ด้านล่างยังได้ error ตามปกติ
    countPromise.catch(() => undefined);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          salary.ID AS ID,
          bank.IDBANK,
          COALESCE(officer.NAME, regisdeegar.NAME) AS NAME,
          COALESCE(salary.CID, '') AS CID,
          salary.MONEY AS MONEY,
          salary.PNUMBER,
          salary.NODEEGAR,
          salary.NUM,
          deegar.CHEQUE,
          cheque.PAYDATE,
          deegar.ACCNUMBER,
          deegar.ACCNAME,
          deegar.TAX,
          deegar.FEE AS PAY
        ${from}
        ${whereClause}
        -- เรียงตามฎีกา/ครั้งที่/ลำดับ/ชื่อ ตามแบบบน server; salary.ID, bank.id ต่อท้ายให้ลำดับไม่ซ้ำ แบ่งหน้าแล้วแถวไม่หาย/ไม่ซ้ำ
        ORDER BY salary.PNUMBER, salary.NODEEGAR, salary.NUM, officer.NAME, salary.ID, bank.id
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    )) as {
      ID: number;
      IDBANK: string | null;
      NAME: string | null;
      CID: string;
      MONEY: number;
      PNUMBER: string;
      NODEEGAR: string;
      NUM: string | null;
      CHEQUE: string | null;
      PAYDATE: Date | null;
      ACCNUMBER?: string | null;
      ACCNAME?: string | null;
      TAX?: number | null;
      PAY?: number | null;
    }[];

    const safeRows = rows.map((row) => ({
      ...row,
      ID: Number(row.ID),
      MONEY: Number(row.MONEY ?? 0),
      TAX: row.TAX === null || row.TAX === undefined ? null : Number(row.TAX),
      PAY: row.PAY === null || row.PAY === undefined ? null : Number(row.PAY),
      PAYDATE: row.PAYDATE instanceof Date ? row.PAYDATE.toISOString() : row.PAYDATE,
    }));

    const countRows = await countPromise;

    const total = Number(countRows?.[0]?.total ?? 0);
    const totals = {
      money: Number(countRows?.[0]?.sumMoney ?? 0),
      tax: Number(countRows?.[0]?.sumTax ?? 0),
      pay: Number(countRows?.[0]?.sumPay ?? 0),
    };

    return NextResponse.json({
      items: safeRows,
      total,
      totals,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: unknown) {
    console.error('deegars API error', err);
    return NextResponse.json({ error: 'Failed to load deegars' }, { status: 500 });
  }
}

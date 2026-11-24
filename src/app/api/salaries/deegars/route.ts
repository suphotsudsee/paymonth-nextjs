import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { latestSalaryMatch, regisdeegarMatch } from '@/lib/keyJoin';
import { salaryKeysAreTrimmed } from '@/lib/keyHygiene';
import { isStaff } from '@/lib/permissions';
import { clampPageSize, parsePage } from '@/lib/pagination';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pnumber = searchParams.get('pnumber')?.trim() || undefined;
    const nodeegar = searchParams.get('nodeegar')?.trim() || undefined;
    const accnumber = searchParams.get('accnumber')?.trim() || undefined;
    const accname = searchParams.get('accname')?.trim() || undefined;
    const cheque = searchParams.get('cheque')?.trim() || undefined;
    const page = parsePage(searchParams.get('page'));
    const pageSize = clampPageSize(searchParams.get('pageSize'), 10);
    const offset = (page - 1) * pageSize;

    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isStaff(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // join แบบเร็วได้ก็ต่อเมื่อ key ของ salary/regisdeegar ไม่ขึ้นต้นด้วยเว้นวรรค (src/lib/keyJoin.ts)
    const keysTrimmed = await salaryKeysAreTrimmed();

    const filters: string[] = [];
    const params: any[] = [];

    if (pnumber) {
      filters.push('deegar.PNUMBER LIKE ?');
      params.push(`%${pnumber}%`);
    }
    if (nodeegar) {
      filters.push('deegar.NODEEGAR LIKE ?');
      params.push(`%${nodeegar}%`);
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

    // นับจำนวนทั้งหมดพร้อมกับดึงหน้าปัจจุบัน (ไม่ขึ้นต่อกัน) — TASK_BOARD #10
    const countPromise = prisma.$queryRawUnsafe(
      `
        -- ยอดรวมของผลค้นหาทั้งหมด (ไม่ใช่เฉพาะหน้าที่แสดง) ใช้แถว Total ของหน้าค้นหาฎีกา — PRD 11.1
        -- นิพจน์เดียวกับคอลัมน์ MONEY/TAX/PAY ใน query หน้าปัจจุบัน
        SELECT COUNT(*) as total,
          COALESCE(SUM(COALESCE(salary.MONEY, deegar.MONEY)), 0) AS sumMoney,
          COALESCE(SUM(deegar.TAX), 0) AS sumTax,
          COALESCE(SUM(deegar.FEE), 0) AS sumPay
        FROM deegar
          LEFT JOIN salary ON salary.ID = (
            SELECT s2.ID
            FROM salary s2
            -- ดู src/lib/keyJoin.ts: แบบเร็วใช้ index ได้, ถ้ามีข้อมูลเก่าขึ้นต้นด้วยเว้นวรรคจะใช้ TRIM ทั้งสองฝั่งแบบเดิม
            WHERE ${latestSalaryMatch(keysTrimmed, "s2", "deegar")}
            ORDER BY s2.DUPDATE DESC, s2.ID DESC
            LIMIT 1
          )
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.CID = salary.CID
          LEFT JOIN regisdeegar ON ${regisdeegarMatch(keysTrimmed, "regisdeegar", "deegar")}
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE
        ${whereClause}
      `,
      ...params,
    ) as Promise<{ total: bigint; sumMoney: unknown; sumTax: unknown; sumPay: unknown }[]>;
    // ถ้า query หน้าปัจจุบันล้มก่อน จะไม่มีใคร await countPromise → กัน unhandled rejection (Node อาจปิด process)
    // ส่วน await countPromise ด้านล่างยังได้ error ตามปกติ
    countPromise.catch(() => undefined);

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          COALESCE(salary.ID, deegar.ID) AS ID,
          bank.IDBANK,
          COALESCE(officer.NAME, regisdeegar.NAME) AS NAME,
          COALESCE(salary.CID, '') AS CID,
          COALESCE(salary.MONEY, deegar.MONEY) AS MONEY,
          deegar.PNUMBER,
          deegar.NODEEGAR,
          salary.NUM,
          deegar.CHEQUE,
          cheque.PAYDATE,
          deegar.ACCNUMBER,
          deegar.ACCNAME,
          deegar.TAX,
          deegar.FEE AS PAY
        FROM deegar
          LEFT JOIN salary ON salary.ID = (
            SELECT s2.ID
            FROM salary s2
            -- ดู src/lib/keyJoin.ts: แบบเร็วใช้ index ได้, ถ้ามีข้อมูลเก่าขึ้นต้นด้วยเว้นวรรคจะใช้ TRIM ทั้งสองฝั่งแบบเดิม
            WHERE ${latestSalaryMatch(keysTrimmed, "s2", "deegar")}
            ORDER BY s2.DUPDATE DESC, s2.ID DESC
            LIMIT 1
          )
          LEFT JOIN officer ON salary.CID = officer.CID
          LEFT JOIN bank ON bank.CID = salary.CID
          LEFT JOIN regisdeegar ON ${regisdeegarMatch(keysTrimmed, "regisdeegar", "deegar")}
          LEFT JOIN cheque ON cheque.CHEQUE = deegar.CHEQUE
        ${whereClause}
        -- (PNUMBER, NODEEGAR) unique ใน deegar แต่ JOIN bank ตาม CID อาจได้หลายแถว → ต่อท้าย deegar.ID, bank.id ให้ลำดับไม่ซ้ำ ข้ามหน้าไม่หาย/ไม่ซ้ำ
        ORDER BY deegar.PNUMBER, deegar.NODEEGAR, deegar.ID, bank.id
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
      PAYTYPE: string | null;
      IDPAY: string | null;
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
  } catch (err: any) {
    console.error('deegars API error', err);
    return NextResponse.json(
      { error: 'Failed to load deegars', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

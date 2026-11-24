import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { pickPeriodsForPage } from "@/lib/reportPaging";
import { periodCountsSql, totalsSql, type ReportsAllFilters } from "@/lib/reportsAllQueries";
import { clampPageSize, parsePage } from '@/lib/pagination';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isStaff(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const cid = searchParams.get("cid")?.trim() || undefined;
    const name = searchParams.get("name")?.trim() || undefined;
    const monththai = searchParams.get("monththai")?.trim() || undefined;
    const yearthai = searchParams.get("yearthai")?.trim() || undefined;
    const page = parsePage(searchParams.get("page"));
    const pageSize = clampPageSize(searchParams.get("pageSize"), 10);
    const offset = (page - 1) * pageSize;

    // ตัวกรองแยกฝั่ง salary (s) กับ officer (o): ยอดรวม/จำนวนต่องวดรวมยอด salary ก่อนแล้วค่อย join officer (PRD 10.3)
    const f: ReportsAllFilters = { salary: ["s.IDPAY <> '20004'"], salaryParams: [], officer: [], officerParams: [] };
    if (cid) {
      f.salary.push("s.CID = ?");
      f.salaryParams.push(cid);
    }
    if (monththai) {
      f.salary.push("s.MONTHTHAI = ?");
      f.salaryParams.push(monththai);
    }
    if (yearthai) {
      f.salary.push("s.YEARTHAI = ?");
      f.salaryParams.push(yearthai);
    }
    if (name) {
      f.officer.push("o.NAME LIKE ?");
      f.officerParams.push(`%${name}%`);
    }

    // query รายการหน้าปัจจุบันใช้เงื่อนไขรวมทั้งสองฝั่ง (join ตรงเหมือนเดิม)
    const whereClause = `WHERE ${[...f.salary, ...f.officer].join(" AND ")}`;
    const params = [...f.salaryParams, ...f.officerParams];
    const periodQ = periodCountsSql(f);
    const totalsQ = totalsSql(f);

    // จำนวนกลุ่ม (CID + เดือน + ปี) แยกตามงวด เรียงแบบเดียวกับรายงาน (ปีล่าสุด → เก่าสุด)
    // ใช้ทั้งเป็นยอดรวมรายการ (แทน COUNT ทั้งตาราง) และเพื่อหาว่าหน้าที่ขอตกอยู่ในงวดไหน — TASK_BOARD #10
    // ยอดเงินรวมไม่ขึ้นกับหน้า จึงรันพร้อมกัน (connection pool ของ Prisma รองรับหลาย query พร้อมกัน)
    const [periods, totals] = await Promise.all([
      prisma.$queryRawUnsafe(periodQ.sql, ...periodQ.params) as Promise<{ YEARTHAI: string; MONTHTHAI: string; n: bigint }[]>,
      prisma.$queryRawUnsafe(totalsQ.sql, ...totalsQ.params) as Promise<{ income: unknown; outcome: unknown }[]>,
    ]);

    const totalRows = periods.reduce((sum, p) => sum + Number(p.n), 0);
    const page_ = pickPeriodsForPage(
      periods.map((p) => ({ year: p.YEARTHAI, month: p.MONTHTHAI, count: Number(p.n) })),
      offset,
      pageSize,
    );

    // เรียงตาม ปี desc, เดือน desc, ชื่อ asc เหมือนเดิม แต่เรียงเฉพาะงวดที่หน้านี้ครอบคลุม (เดิมเรียงทุกกลุ่มทั้งตาราง ~111,000 กลุ่ม)
    // แล้วค่อยรวมยอดเฉพาะ key ที่ได้ (derived table) เหมือนเดิม
    const rows = page_.periods.length === 0 ? [] : ((await prisma.$queryRawUnsafe(
      `
        SELECT o.NAME,
               o.LPOS,
               st.NAMESTATION,
               s.MONTHTHAI,
               cm.NAMEMONTH_TH,
               s.YEARTHAI,
               s.CID,
               GROUP_CONCAT(DISTINCT cp.PAYNAME ORDER BY cp.PAYNAME SEPARATOR ', ') AS PAYNAME,
               SUM(CASE WHEN cp.PAYTYPE = '1' THEN s.MONEY ELSE 0 END) AS INCOME,
               SUM(CASE WHEN cp.PAYTYPE <> '1' THEN s.MONEY ELSE 0 END) AS OUTCOME
        FROM (
          SELECT s.CID, s.MONTHTHAI, s.YEARTHAI
          FROM salary s
          JOIN officer o ON o.CID = s.CID
          ${whereClause}
            AND (${page_.periods.map(() => "(s.YEARTHAI = ? AND s.MONTHTHAI = ?)").join(" OR ")})
          GROUP BY s.CID, s.MONTHTHAI, s.YEARTHAI
          ORDER BY s.YEARTHAI DESC, s.MONTHTHAI DESC, o.NAME ASC
          LIMIT ? OFFSET ?
        ) AS pk
        JOIN salary s ON s.CID = pk.CID AND s.MONTHTHAI = pk.MONTHTHAI AND s.YEARTHAI = pk.YEARTHAI
        JOIN officer o ON o.CID = s.CID
        LEFT JOIN station st ON st.CODE = o.CODE
        JOIN cpay cp ON cp.IDPAY = s.IDPAY
        LEFT JOIN cmonth cm ON cm.ID = s.MONTHTHAI
        GROUP BY s.CID, s.MONTHTHAI, s.YEARTHAI, o.NAME, o.LPOS, st.NAMESTATION, cm.NAMEMONTH_TH
        ORDER BY s.YEARTHAI DESC, s.MONTHTHAI DESC, o.NAME ASC;
      `,
      ...params,
      ...page_.periods.flatMap((p) => [p.year, p.month]),
      pageSize,
      page_.offsetWithin,
    )) as {
      NAME: string | null;
      LPOS: string | null;
      NAMESTATION: string | null;
      CID: string;
      MONTHTHAI: string;
      YEARTHAI: string;
      NAMEMONTH_TH: string | null;
      PAYNAME: string | null;
      INCOME: any;
      OUTCOME: any;
    }[]);

    const totalIncome = Number(totals?.[0]?.income ?? 0);
    const totalOutcome = Number(totals?.[0]?.outcome ?? 0);

    const items = rows.map((r) => ({
      CID: r.CID,
      NAME: r.NAME,
      LPOS: r.LPOS,
      STATION: r.NAMESTATION,
      MONTHTHAI: r.MONTHTHAI,
      NAMEMONTH_TH: r.NAMEMONTH_TH,
      YEARTHAI: r.YEARTHAI,
      PAYNAME: r.PAYNAME,
      INCOME: Number(r.INCOME ?? 0),
      OUTCOME: Number(r.OUTCOME ?? 0),
    }));

    return NextResponse.json({
      items,
      total: totalRows,
      page,
      pageSize,
      totalPages: Math.ceil(totalRows / pageSize),
      totalIncome,
      totalOutcome,
    });
  } catch (err: any) {
    console.error("reports/all API error", err);
    return NextResponse.json(
      { error: "Failed to load report data", detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

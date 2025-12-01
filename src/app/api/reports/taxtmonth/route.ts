import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

type Row = {
  ID: any;
  PAYNAME: string | null;
  YEARTHAI: string | null;
  m01: any;
  m02: any;
  m03: any;
  m04: any;
  m05: any;
  m06: any;
  m07: any;
  m08: any;
  m09: any;
  m10: any;
  m11: any;
  m12: any;
  allmonth: any;
  totalRows?: any;
};

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let yearthai = searchParams.get('yearthai')?.trim();
    const station = searchParams.get('station')?.trim() || '';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || 50)));
    const offset = (page - 1) * pageSize;

    // If year not provided, pick the latest YEARTHAI from salary as a sensible default.
    if (!yearthai) {
      const latest = await prisma.$queryRawUnsafe<{ latest: string | null }[]>(
        `SELECT MAX(YEARTHAI) as latest FROM salary WHERE YEARTHAI IS NOT NULL`,
      );
      yearthai = latest?.[0]?.latest ?? '';
    if (!yearthai) {
      return NextResponse.json({
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
        totals: {},
        stationName: station,
        yearthai: '',
      });
    }
  }

    const rows = await prisma.$queryRawUnsafe<Row[]>(
      `
        SELECT "" AS ID, m.IDPAY, m.PAYNAME, m.YEARTHAI,
          SUM(IF(m.MONTHTHAI='01', m.SUMMONEY, NULL)) AS m01,
          SUM(IF(m.MONTHTHAI='02', m.SUMMONEY, NULL)) AS m02,
          SUM(IF(m.MONTHTHAI='03', m.SUMMONEY, NULL)) AS m03,
          SUM(IF(m.MONTHTHAI='04', m.SUMMONEY, NULL)) AS m04,
          SUM(IF(m.MONTHTHAI='05', m.SUMMONEY, NULL)) AS m05,
          SUM(IF(m.MONTHTHAI='06', m.SUMMONEY, NULL)) AS m06,
          SUM(IF(m.MONTHTHAI='07', m.SUMMONEY, NULL)) AS m07,
          SUM(IF(m.MONTHTHAI='08', m.SUMMONEY, NULL)) AS m08,
          SUM(IF(m.MONTHTHAI='09', m.SUMMONEY, NULL)) AS m09,
          SUM(IF(m.MONTHTHAI='10', m.SUMMONEY, NULL)) AS m10,
          SUM(IF(m.MONTHTHAI='11', m.SUMMONEY, NULL)) AS m11,
          SUM(IF(m.MONTHTHAI='12', m.SUMMONEY, NULL)) AS m12,
          SUM(m.SUMMONEY) AS allmonth,
          COUNT(*) OVER() AS totalRows
        FROM (
          SELECT
            cpay.IDPAY,
            cpay.PAYNAME,
            salary.MONTHTHAI,
            salary.YEARTHAI,
            SUM(salary.MONEY) AS SUMMONEY,
            station.NAMESTATION
          FROM officer
            INNER JOIN salary ON officer.CID = salary.CID
            RIGHT OUTER JOIN cpay ON salary.IDPAY = cpay.IDPAY
            INNER JOIN station ON officer.CODE = station.CODE
          WHERE
            salary.YEARTHAI = ?
            AND station.NAMESTATION LIKE ?
            AND cpay.PAYTYPE = 1
            AND station.CODE NOT IN ('777','999')
            AND SUBSTR(officer.NAME,1,3) <> 'รพ.'
            AND SUBSTR(officer.NAME,1,4) <> 'สสอ.'
            AND cpay.IDPAY IN ('10001','10002','10004','10005','10010')
          GROUP BY cpay.IDPAY, salary.YEARTHAI, salary.MONTHTHAI
          ORDER BY salary.YEARTHAI, salary.MONTHTHAI, cpay.IDPAY
        ) AS m
        GROUP BY m.IDPAY
        ORDER BY m.IDPAY
        LIMIT ? OFFSET ?
      `,
      yearthai,
      `%${station}%`,
      pageSize,
      offset,
    );

    const toNumber = (v: any) => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0));

    const items = rows.map((row) => ({
      PAYNAME: row.PAYNAME ?? '',
      YEARTHAI: row.YEARTHAI ?? '',
      m01: toNumber(row.m01),
      m02: toNumber(row.m02),
      m03: toNumber(row.m03),
      m04: toNumber(row.m04),
      m05: toNumber(row.m05),
      m06: toNumber(row.m06),
      m07: toNumber(row.m07),
      m08: toNumber(row.m08),
      m09: toNumber(row.m09),
      m10: toNumber(row.m10),
      m11: toNumber(row.m11),
      m12: toNumber(row.m12),
      allmonth: toNumber(row.allmonth),
      totalRows: toNumber(row.totalRows),
    }));

    const total = toNumber(items?.[0]?.totalRows ?? 0);
    const totals = items.reduce(
      (acc, r) => {
        acc.m01 += r.m01;
        acc.m02 += r.m02;
        acc.m03 += r.m03;
        acc.m04 += r.m04;
        acc.m05 += r.m05;
        acc.m06 += r.m06;
        acc.m07 += r.m07;
        acc.m08 += r.m08;
        acc.m09 += r.m09;
        acc.m10 += r.m10;
        acc.m11 += r.m11;
        acc.m12 += r.m12;
        acc.allmonth += r.allmonth;
        return acc;
      },
      {
        m01: 0,
        m02: 0,
        m03: 0,
        m04: 0,
        m05: 0,
        m06: 0,
        m07: 0,
        m08: 0,
        m09: 0,
        m10: 0,
        m11: 0,
        m12: 0,
        allmonth: 0,
      },
    );

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totals,
      stationName: station,
      yearthai,
    });
  } catch (err: any) {
    console.error('reports taxtmonth API error', err);
    return NextResponse.json(
      { error: 'Failed to load tax group report', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

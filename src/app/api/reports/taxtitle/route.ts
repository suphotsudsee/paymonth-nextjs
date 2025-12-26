import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

type Row = {
  ID: any;
  CID: string | null;
  NAME: string | null;
  DEPART: string | null;
  NAMESTATION: string | null;
  YEARTHAI: string | null;
  x10001: any;
  x10002: any;
  x10004: any;
  x10005: any;
  x10010: any;
  x20001: any;
  SUMMONEY: any;
};

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    let yearthai = searchParams.get('yearthai')?.trim();
    const depart = searchParams.get('depart')?.trim() || '';
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') || 90)));
    const offset = (page - 1) * pageSize;

    if (!yearthai) {
      const latest = (await prisma.$queryRawUnsafe(
        `SELECT MAX(YEARTHAI) as latest FROM salary WHERE YEARTHAI IS NOT NULL`,
      )) as { latest: string | null }[];
      yearthai = latest?.[0]?.latest ?? '';
      if (!yearthai) {
        return NextResponse.json({
          items: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          totalIncome: 0,
          totalTax: 0,
        });
      }
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT
          agg.ID,
          agg.CID,
          agg.NAME,
          agg.DEPART,
          agg.NAMESTATION,
          agg.YEARTHAI,
          agg.x10001,
          agg.x10002,
          agg.x10004,
          agg.x10005,
          agg.x10010,
          agg.x20001,
          agg.SUMMONEY
        FROM (
          SELECT
            officer.officerid AS ID,
            officer.CID,
            officer.NAME,
            station.DEPART,
            station.NAMESTATION,
            salary.YEARTHAI,
            SUM(CASE WHEN cpay.IDPAY = '10001' THEN salary.MONEY ELSE 0 END) AS x10001,
            SUM(CASE WHEN cpay.IDPAY = '10002' THEN salary.MONEY ELSE 0 END) AS x10002,
            SUM(CASE WHEN cpay.IDPAY = '10004' THEN salary.MONEY ELSE 0 END) AS x10004,
            SUM(CASE WHEN cpay.IDPAY = '10005' THEN salary.MONEY ELSE 0 END) AS x10005,
            SUM(CASE WHEN cpay.IDPAY = '10010' THEN salary.MONEY ELSE 0 END) AS x10010,
            SUM(CASE WHEN cpay.IDPAY = '20001' THEN salary.MONEY ELSE 0 END) AS x20001,
            SUM(
              CASE WHEN cpay.IDPAY IN ('10001','10002','10004','10005','10010') THEN salary.MONEY ELSE 0 END
            ) AS SUMMONEY
          FROM officer
            LEFT JOIN salary ON officer.CID = salary.CID
            LEFT JOIN station ON officer.CODE = station.CODE
            LEFT JOIN cpay ON salary.IDPAY = cpay.IDPAY
          WHERE
            salary.YEARTHAI = ?
            AND station.DEPART LIKE ?
            AND station.CODE NOT IN ('777','999')
            AND SUBSTR(officer.NAME,1,3) <> 'รพ.'
            AND SUBSTR(officer.NAME,1,4) <> 'สสอ.'
          GROUP BY officer.CID
          HAVING SUMMONEY > 0
          ORDER BY officer.officerid
          LIMIT ? OFFSET ?
        ) AS agg
      `,
      yearthai,
      `%${depart}%`,
      pageSize,
      offset,
    )) as Row[];

    const countRows = (await prisma.$queryRawUnsafe(
      `
        SELECT COUNT(*) as total FROM (
          SELECT officer.CID
          FROM officer
            LEFT JOIN salary ON officer.CID = salary.CID
            LEFT JOIN station ON officer.CODE = station.CODE
            LEFT JOIN cpay ON salary.IDPAY = cpay.IDPAY
          WHERE
            salary.YEARTHAI = ?
            AND station.DEPART LIKE ?
            AND station.CODE NOT IN ('777','999')
            AND SUBSTR(officer.NAME,1,3) <> 'รพ.'
            AND SUBSTR(officer.NAME,1,4) <> 'สสอ.'
          GROUP BY officer.CID
          HAVING SUM(
            CASE WHEN cpay.IDPAY IN ('10001','10002','10004','10005','10010') THEN salary.MONEY ELSE 0 END
          ) > 0
        ) grouped
      `,
      yearthai,
      `%${depart}%`,
    )) as { total: bigint }[];

    const items = rows.map((row) => ({
      ID: Number(row.ID ?? 0),
      CID: row.CID ?? '',
      NAME: row.NAME ?? '',
      DEPART: row.DEPART ?? '',
      NAMESTATION: row.NAMESTATION ?? '',
      YEARTHAI: row.YEARTHAI ?? '',
      x10001: Number(row.x10001 ?? 0),
      x10002: Number(row.x10002 ?? 0),
      x10004: Number(row.x10004 ?? 0),
      x10005: Number(row.x10005 ?? 0),
      x10010: Number(row.x10010 ?? 0),
      TAX: Number(row.x20001 ?? 0),
      SUMMONEY: Number(row.SUMMONEY ?? 0),
    }));

    const totalIncome = items.reduce((sum, r) => sum + r.SUMMONEY, 0);
    const totalTax = items.reduce((sum, r) => sum + r.TAX, 0);
    const total = Number(countRows?.[0]?.total ?? 0);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      totalIncome,
      totalTax,
    });
  } catch (err: any) {
    console.error('reports taxtitle API error', err);
    return NextResponse.json(
      { error: 'Failed to load tax (title) report', detail: String(err?.message || err) },
      { status: 500 },
    );
  }
}

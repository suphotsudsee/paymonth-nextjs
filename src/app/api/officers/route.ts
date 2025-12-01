import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get('session')?.value);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || 10)));
    const offset = (page - 1) * pageSize;

    const cid = searchParams.get('cid')?.trim();
    const coop = searchParams.get('coop')?.trim();
    const name = searchParams.get('name')?.trim();
    const station = searchParams.get('station')?.trim();

    const filters: string[] = [];
    const params: any[] = [];

    if (cid) {
      filters.push('o.CID LIKE ?');
      params.push(`%${cid}%`);
    }
    if (coop) {
      filters.push('o.IDCOOP LIKE ?');
      params.push(`%${coop}%`);
    }
    if (name) {
      filters.push('o.NAME LIKE ?');
      params.push(`%${name}%`);
    }
    if (station) {
      filters.push('(s.NAMESTATION LIKE ? OR o.LPOS LIKE ?)');
      params.push(`%${station}%`, `%${station}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const itemsPromise = prisma.$queryRawUnsafe<
      {
        CID: string;
        IDCOOP: string | null;
        NAME: string | null;
        LPOS: string | null;
        CODE: string | null;
        NAMESTATION: string | null;
      }[]
    >(
      `
        SELECT o.CID, o.IDCOOP, o.NAME, o.LPOS, o.CODE, s.NAMESTATION
        FROM officer o
        LEFT JOIN station s ON o.CODE = s.CODE
        ${whereClause}
        ORDER BY o.NAME ASC
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    );

    const countPromise = prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `
        SELECT COUNT(*) as total
        FROM officer o
        LEFT JOIN station s ON o.CODE = s.CODE
        ${whereClause}
      `,
      ...params,
    );

    const [items, countRows] = await Promise.all([itemsPromise, countPromise]);
    const total = Number(countRows?.[0]?.total ?? 0);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error('officers API error', err);
    return NextResponse.json({ error: 'Failed to load officers', detail: String(err?.message || err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      cid,
      idcoop,
      idman,
      no,
      code,
      id,
      name,
      sex,
      lpos,
      mobile,
      email,
    } = body;

    if (!cid) {
      return NextResponse.json({ error: "CID is required" }, { status: 400 });
    }

    // Check if officer already exists
    const existingOfficer = await prisma.officer.findUnique({
      where: { CID: cid },
    });

    if (existingOfficer) {
      return NextResponse.json(
        { error: "Officer with this CID already exists" },
        { status: 400 }
      );
    }

    const newOfficer = await prisma.officer.create({
      data: {
        CID: cid,
        IDCOOP: idcoop || null,
        IDMAN: idman || null,
        NO: no || null,
        CODE: code || null,
        ID: id || null,
        NAME: name || null,
        SEX: sex || null,
        LPOS: lpos || null,
        MOBILE: mobile || null,
        EMAIL: email || null,
        DUPDATE: new Date(),
      },
    });

    return NextResponse.json({ officer: newOfficer }, { status: 201 });
  } catch (err: any) {
    console.error("officer CREATE error", err);
    return NextResponse.json(
      { error: "Failed to create officer", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

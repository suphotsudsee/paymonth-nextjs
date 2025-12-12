import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

const hashPassword = (raw: string) => crypto.createHash('sha1').update(raw).digest('hex');

const deriveNameParts = (
  rawName: unknown,
  cid: string,
  overrides?: { fname?: unknown; lname?: unknown },
) => {
  const baseName = typeof rawName === 'string' ? rawName.trim() : '';
  const fnameOverride = typeof overrides?.fname === 'string' ? overrides.fname.trim() : '';
  const lnameOverride = typeof overrides?.lname === 'string' ? overrides.lname.trim() : '';

  if (fnameOverride || lnameOverride) {
    const username = [fnameOverride || baseName || cid, lnameOverride].filter(Boolean).join(' ').trim() || cid;
    return {
      fname: fnameOverride || baseName || cid,
      lname: lnameOverride,
      username,
    };
  }

  const [first, ...rest] = baseName.split(/\s+/).filter(Boolean);
  const fname = first || baseName || cid;
  const lname = rest.join(' ').trim();
  const username = [fname, lname].filter(Boolean).join(' ').trim() || cid;
  return { fname, lname, username };
};

async function createUserForOfficer(params: {
  cid: string;
  name?: string | null;
  fname?: string | null;
  lname?: string | null;
  idbank?: string | null;
  mobile?: string | null;
  email?: string | null;
}) {
  const existingUser = await prisma.user.findUnique({ where: { cid: params.cid } });
  if (existingUser) {
    return { created: false, reason: 'user_exists' as const };
  }

  let bankAccount = typeof params.idbank === 'string' ? params.idbank.trim() : '';
  if (!bankAccount) {
    const bankRow = await prisma.bank.findFirst({
      where: { CID: params.cid },
      orderBy: { id: 'asc' },
      select: { IDBANK: true },
    });
    bankAccount = bankRow?.IDBANK?.trim() ?? '';
  }

  if (!bankAccount) {
    return { created: false, reason: 'missing_idbank' as const };
  }

  const { fname, lname, username } = deriveNameParts(params.name, params.cid, {
    fname: params.fname ?? undefined,
    lname: params.lname ?? undefined,
  });

  const user = await prisma.user.create({
    data: {
      username,
      password: hashPassword(`##${bankAccount}##`),
      cid: params.cid,
      fname,
      lname,
      status: 'user',
      accessLevel: 0,
      mobile: params.mobile ? String(params.mobile).trim() : '',
      email: params.email ? String(params.email).trim() : '',
    },
  });

  return { created: true, reason: 'created' as const, userId: user.id };
}

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

    // ❗ important: NEVER interpolate user input directly into the SQL template string.
    // Always pass dynamic values via "?" placeholders in the parameter list.
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
    const status = String(session.status || "").toLowerCase();
    const accessLevel = Number(session.accessLevel || 0);
    const isLimitedUser = status === "user" && accessLevel <= 0;
    if (isLimitedUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      fname,
      lname,
      idbank,
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

    let userCreationResult: { created: boolean; reason?: string } = { created: false };
    try {
      userCreationResult = await createUserForOfficer({
        cid,
        name,
        fname,
        lname,
        idbank,
        mobile,
        email,
      });
    } catch (userErr: any) {
      console.error("auto create user failed", userErr);
      userCreationResult = { created: false, reason: "user_creation_error" };
    }

    return NextResponse.json(
      { officer: newOfficer, userCreated: userCreationResult.created, userCreateReason: userCreationResult.reason },
      { status: 201 },
    );
  } catch (err: any) {
    console.error("officer CREATE error", err);
    return NextResponse.json(
      { error: "Failed to create officer", detail: String(err?.message || err) },
      { status: 500 }
    );
  }
}

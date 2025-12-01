import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

type UserRow = {
  id: number;
  username: string;
  password: string;
  cid: string;
  fname: string;
  lname: string;
  status: string;
  accessLevel: number;
  mobile: string;
  email: string;
};

const hashPassword = (raw: string) => crypto.createHash("sha1").update(raw).digest("hex");

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") || 10)));
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: (string | number)[] = [];

    const idParam = searchParams.get("id");
    if (idParam && !Number.isNaN(Number(idParam))) {
      filters.push("u.id = ?");
      params.push(Number(idParam));
    }

    const username = searchParams.get("username")?.trim();
    if (username) {
      filters.push("u.username LIKE ?");
      params.push(`%${username}%`);
    }

    const cid = searchParams.get("cid")?.trim();
    if (cid) {
      filters.push("u.cid LIKE ?");
      params.push(`%${cid}%`);
    }

    const fname = searchParams.get("fname")?.trim();
    if (fname) {
      filters.push("u.fname LIKE ?");
      params.push(`%${fname}%`);
    }

    const lname = searchParams.get("lname")?.trim();
    if (lname) {
      filters.push("u.lname LIKE ?");
      params.push(`%${lname}%`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const itemsPromise = prisma.$queryRawUnsafe<UserRow[]>(
      `
        SELECT u.id, u.username, u.password, u.cid, u.fname, u.lname, u.status, u.accessLevel, u.mobile, u.email
        FROM user u
        ${whereClause}
        ORDER BY u.id ASC
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    );

    const countPromise = prisma.$queryRawUnsafe<{ total: bigint }[]>(
      `
        SELECT COUNT(*) as total
        FROM user u
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
  } catch (err: unknown) {
    console.error("users list error", err);
    const detail = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: "ไม่สามารถดึงข้อมูลผู้ใช้ได้", detail }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const username = String(body?.username || "").trim();
    const password = String(body?.password || "").trim();
    const cid = String(body?.cid || "").trim();
    const fname = String(body?.fname || "").trim();
    const lname = String(body?.lname || "").trim();
    const status = String(body?.status || "").trim();
    const mobile = String(body?.mobile || "").trim();
    const email = String(body?.email || "").trim();
    const accessLevel = Number(body?.accessLevel ?? 0);

    if (!username || !password || !cid) {
      return NextResponse.json({ error: "กรอก username, password และ CID ให้ครบ" }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json({ error: "มี username นี้อยู่แล้ว" }, { status: 409 });
    }

    const created = await prisma.user.create({
      data: {
        username,
        password: hashPassword(password),
        cid,
        fname,
        lname,
        status,
        mobile,
        email,
        accessLevel: Number.isFinite(accessLevel) ? accessLevel : 0,
      },
    });

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("user create error", err);
    const detail = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: "ไม่สามารถสร้างผู้ใช้ได้", detail }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";

type UserOnlineRow = {
  id?: number;
  username: string | null;
  password: string | null;
  logined: string | null;
  ipv4: string | null;
  logindate: string | Date | null;
};

const normalizeDate = (value: string | null) => {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || 20)));
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: (string | number | Date)[] = [];

    const username = searchParams.get("username")?.trim();
    if (username) {
      filters.push("username LIKE ?");
      params.push(`%${username}%`);
    }

    const ipv4 = searchParams.get("ipv4")?.trim();
    if (ipv4) {
      filters.push("ipv4 LIKE ?");
      params.push(`%${ipv4}%`);
    }

    const logined = searchParams.get("logined")?.trim().toUpperCase();
    if (logined === "Y" || logined === "N") {
      filters.push("logined = ?");
      params.push(logined);
    }

    const startDateRaw = searchParams.get("startDate");
    if (startDateRaw) {
      const start = normalizeDate(startDateRaw);
      if (start) {
        filters.push("logindate >= ?");
        params.push(start);
      }
    }

    const endDateRaw = searchParams.get("endDate");
    if (endDateRaw) {
      const end = normalizeDate(endDateRaw);
      if (end) {
        end.setDate(end.getDate() + 1);
        end.setMilliseconds(end.getMilliseconds() - 1);
        filters.push("logindate <= ?");
        params.push(end);
      }
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const itemsPromise = prisma.$queryRawUnsafe(
      `
        SELECT id, username, password, logined, ipv4, logindate
        FROM useronline
        ${whereClause}
        ORDER BY logindate DESC
        LIMIT ? OFFSET ?
      `,
      ...params,
      pageSize,
      offset,
    ) as Promise<UserOnlineRow[]>;

    const countPromise = prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as total FROM useronline ${whereClause}`,
      ...params,
    ) as Promise<{ total: bigint }[]>;

    const [rows, countRows] = await Promise.all([itemsPromise, countPromise]);
    const total = Number(countRows?.[0]?.total ?? 0);

    const items = rows.map((row, idx) => ({
      ...row,
      id: typeof row.id === "number" ? row.id : idx + 1 + offset,
      logindate: row.logindate ? new Date(row.logindate) : null,
    }));

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: unknown) {
    console.error("useronline report error", err);
    const detail = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลการใช้งานได้", detail }, { status: 500 });
  }
}

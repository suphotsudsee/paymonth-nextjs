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

const parseId = async (params: Promise<{ id: string }>) => {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return null;
  return numeric;
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = await parseId(params);
    if (!id) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const rows = await prisma.$queryRawUnsafe<UserRow[]>(
      `
        SELECT id, username, password, cid, fname, lname, status, accessLevel, mobile, email
        FROM user
        WHERE id = ?
        LIMIT 1
      `,
      id,
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: unknown) {
    console.error("user detail error", err);
    const detail = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: "ไม่สามารถโหลดข้อมูลผู้ใช้ได้", detail }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = await parseId(params);
    if (!id) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const username = typeof body.username === "string" ? body.username.trim() : undefined;
    const cid = typeof body.cid === "string" ? body.cid.trim() : undefined;
    const fname = typeof body.fname === "string" ? body.fname.trim() : undefined;
    const lname = typeof body.lname === "string" ? body.lname.trim() : undefined;
    const status = typeof body.status === "string" ? body.status.trim() : undefined;
    const mobile = typeof body.mobile === "string" ? body.mobile.trim() : undefined;
    const email = typeof body.email === "string" ? body.email.trim() : undefined;
    const accessLevelRaw = body.accessLevel;
    const passwordRaw = typeof body.password === "string" ? body.password.trim() : undefined;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (username) {
      const duplicate = await prisma.user.findFirst({
        where: { username, NOT: { id } },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ error: "มี username นี้อยู่แล้ว" }, { status: 409 });
      }
    }

    const updates: string[] = [];
    const paramsUpdate: (string | number)[] = [];

    const addUpdate = (clause: string, value: string | number | null) => {
      updates.push(clause);
      paramsUpdate.push(value ?? "");
    };

    if (username !== undefined) addUpdate("username = ?", username);
    if (cid !== undefined) addUpdate("cid = ?", cid);
    if (fname !== undefined) addUpdate("fname = ?", fname);
    if (lname !== undefined) addUpdate("lname = ?", lname);
    if (status !== undefined) addUpdate("status = ?", status);
    if (mobile !== undefined) addUpdate("mobile = ?", mobile);
    if (email !== undefined) addUpdate("email = ?", email);
    if (accessLevelRaw !== undefined) {
      const accessLevel = Number(accessLevelRaw);
      addUpdate("accessLevel = ?", Number.isFinite(accessLevel) ? accessLevel : 0);
    }
    if (passwordRaw) {
      addUpdate("password = ?", hashPassword(passwordRaw));
    }

    if (!updates.length) {
      return NextResponse.json({ error: "ไม่มีข้อมูลที่ต้องการบันทึก" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `
        UPDATE user
        SET ${updates.join(", ")}
        WHERE id = ?
      `,
      ...paramsUpdate,
      id,
    );

    const updated = await prisma.user.findUnique({ where: { id } });
    return NextResponse.json({ user: updated });
  } catch (err: unknown) {
    console.error("user update error", err);
    const detail = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: "ไม่สามารถบันทึกข้อมูลผู้ใช้ได้", detail }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession(req.cookies.get("session")?.value);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = await parseId(params);
    if (!id) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("user delete error", err);
    const detail = (err as Error)?.message ?? String(err);
    return NextResponse.json({ error: "ไม่สามารถลบผู้ใช้ได้", detail }, { status: 500 });
  }
}

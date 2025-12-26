import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { verifySession, type SessionPayload } from "@/lib/auth";

export type AppRole = "ADMIN" | "EDITOR" | "USER";

export type AppSession = {
  userId: number;
  cid: string;
  role: AppRole;
  accessLevel: number;
  status?: string;
  fname?: string;
  lname?: string;
  officerId?: number | null;
  orgId?: string | null;
};

const deriveRole = (session: SessionPayload): AppRole => {
  const status = String(session.status ?? "").toLowerCase();
  const accessLevel = Number(session.accessLevel ?? 0);
  if (status.includes("admin") || status.includes("manager")) return "ADMIN";
  if (status.includes("editor")) return "EDITOR";
  if (status === "user") return "USER";
  if (accessLevel >= 1) return "ADMIN";
  return "USER";
};

export async function getAppSessionFromToken(token?: string): Promise<AppSession | null> {
  const session = await verifySession(token);
  if (!session) return null;

  const cid = String(session.cid ?? "").trim();
  if (!cid) return null;

  const officer = await prisma.officer.findUnique({
    where: { CID: cid },
    select: { OFFICERID: true, CODE: true },
  });

  return {
    userId: Number(session.id ?? 0),
    cid,
    role: deriveRole(session),
    accessLevel: Number(session.accessLevel ?? 0),
    status: session.status,
    fname: session.fname,
    lname: session.lname,
    officerId: officer?.OFFICERID ? Number(officer.OFFICERID) : null,
    orgId: officer?.CODE ?? null,
  };
}

export async function getAppSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  return getAppSessionFromToken(cookieStore.get("session")?.value);
}

export async function getAppSessionFromRequest(req: NextRequest): Promise<AppSession | null> {
  return getAppSessionFromToken(req.cookies.get("session")?.value);
}

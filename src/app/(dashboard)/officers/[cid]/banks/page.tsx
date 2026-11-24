'use server';

import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

type BankRow = {
  id: bigint | number;
  CID: string;
  IDBANK: string;
  NAMEBANK: string | null;
};

type OfficerRow = {
  CID: string;
  NAME: string | null;
};

async function loadOfficer(cid: string): Promise<OfficerRow | null> {
  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT CID, NAME
      FROM officer
      WHERE CID = ?
      LIMIT 1
    `,
    cid,
  )) as OfficerRow[];
  return rows[0] ?? null;
}

export default async function ManageBanksPage({
  params,
}: {
  params: Promise<{ cid: string }> | { cid: string };
}) {
  const resolved = params instanceof Promise ? await params : params;
  const cid = resolved?.cid;

  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  const session = await verifySession(token);
  if (!session) {
    redirect("/login");
  }

  if (!cid) {
    redirect("/officers");
  }

  const officer = await loadOfficer(cid);
  if (!officer) {
    return (
      <div className="d-flex flex-column flex-grow-1">
        <AppHeader activePath="/officers" />
        <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
          <div className="h6 fw-bold mb-2">
            <h1 className="h4 mb-0">Officer not found</h1>
          </div>
          <div className="alert alert-danger text-center m-3">
            Could not find officer with CID: {cid}
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const banks: BankRow[] = await prisma.bank.findMany({
    where: { CID: cid },
    orderBy: { id: "asc" },
  });

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/officers" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <div className="h6 fw-bold mb-2">
          <h1 className="h4 mb-0">บัญชีธนาคารสำหรับ {officer.NAME ?? officer.CID}</h1>
        </div>

        <div className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>รายการบัญชี</span>
            <span className="small text-secondary fw-semibold">
              Displaying {banks.length > 0 ? 1 : 0}-{banks.length} of {banks.length} results.
            </span>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>CID</th>
                  <th>IDBANK</th>
                  <th>NAMEBANK</th>
                </tr>
              </thead>
              <tbody>
                {banks.map((bank) => (
                  <tr key={Number(bank.id)}>
                    <td>{Number(bank.id)}</td>
                    <td>{bank.CID}</td>
                    <td>{bank.IDBANK}</td>
                    <td>{bank.NAMEBANK ?? "-"}</td>
                  </tr>
                ))}
                {banks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-secondary p-3">
                      No banks found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

'use server';

import prisma from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import styles from "../../page.module.css";

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
  const rows = await prisma.$queryRawUnsafe<OfficerRow[]>(
    `
      SELECT CID, NAME
      FROM officer
      WHERE CID = ?
      LIMIT 1
    `,
    cid,
  );
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
      <div className={styles.page}>
        <AppHeader activePath="/officers" />
        <main className={styles.main}>
          <div className={styles.sectionTitle}>
            <h1>Officer not found</h1>
          </div>
          <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
            Could not find officer with CID: {cid}
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const banks = await prisma.bank.findMany({
    where: { CID: cid },
    orderBy: { id: "asc" },
  });

  return (
    <div className={styles.page}>
      <AppHeader activePath="/officers" />

      <main className={styles.main}>
        <div className={styles.sectionTitle}>
          <h1>บัญชีธนาคารสำหรับ {officer.NAME ?? officer.CID}</h1>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>รายการบัญชี</span>
            <span className={styles.resultText}>
              Displaying {banks.length > 0 ? 1 : 0}-{banks.length} of {banks.length} results.
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
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
                    <td colSpan={4} className={styles.emptyState}>
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

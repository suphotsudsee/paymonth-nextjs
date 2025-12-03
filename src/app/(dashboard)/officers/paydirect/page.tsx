'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "../page.module.css";

type OfficerInfo = {
  cid: string;
  name?: string | null;
  position?: string | null;
  station?: string | null;
};

type PaydirectRow = {
  id: string;
  A: string | null;
  B: string | null;
  NAMEMONTH_TH: string | null;
  TOTALINCOME: string | null;
  TOTALOUTCOME: string | null;
  BALANCE: string | null;
  PAYID: string | null;
};

const toBaht = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num)) return 0;
  return num / 100;
};

const formatBaht = (value: string | number | null | undefined) =>
  toBaht(value).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MyPaydirectPage() {
  const [cid, setCid] = useState<string | null>(null);
  const [officer, setOfficer] = useState<OfficerInfo | null>(null);
  const [items, setItems] = useState<PaydirectRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const pageSize = 10;

  const resolveCid = async (): Promise<string> => {
    if (cid) return cid;
    const meRes = await fetch("/api/auth/me", { credentials: "include" });
    const meJson = await meRes.json().catch(() => ({}));
    if (!meRes.ok || !meJson?.user?.cid) {
      throw new Error(meJson?.error || "Unauthorized");
    }
    setCid(meJson.user.cid);
    return meJson.user.cid as string;
  };

  const loadPage = async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const currentCid = await resolveCid();
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });

      const res = await fetch(`/api/officers/${currentCid}/paydirect?${params.toString()}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load paydirect data");
      }

      setOfficer(json.officer ?? null);
      setItems(json.items ?? []);
      setPage(json.page ?? targetPage);
      setTotalPages(json.totalPages ?? 1);
    } catch (err: any) {
      setError(err?.message || "Failed to load paydirect data");
      setItems([]);
      setOfficer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pageWindow = useMemo(() => {
    const total = Math.max(1, totalPages);
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("userName");
        window.localStorage.removeItem("userStatus");
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.titleArea}>
          <h1>My PayDirect</h1>
          <p>Salary slips available for your account</p>
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <div>
              <span>PayDirect list</span>
              {officer && (
                <div className={styles.paydirectHeader}>
                  <div className={styles.paydirectName}>{officer.name ?? officer.cid}</div>
                  <div className={styles.paydirectMetaRow}>
                    <span>{`CID: ${officer.cid}`}</span>
                    {officer.position && <span>{`Position: ${officer.position}`}</span>}
                    {officer.station && <span>{`Station: ${officer.station}`}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                Page {page} of {totalPages} • {items.length} items
              </span>
              <button className={styles.createBtn} type="button" onClick={() => loadPage(1)} disabled={loading}>
                Refresh
              </button>
              <button className={styles.secondaryBtn} type="button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.paydirectTableSection}>
            <div className={styles.tableTop}>
              <div className={styles.tableTitle}>Salary slips</div>
              <div className={styles.results}>Rows per page: {pageSize}</div>
            </div>
            <div className={styles.paydirectTableWrap}>
              <table className={styles.paydirectTable}>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Month</th>
                    <th>Total income</th>
                    <th>Total outcome</th>
                    <th>Net</th>
                    <th>Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6}>Loading...</td>
                    </tr>
                  )}
                  {!loading && items.length === 0 && (
                    <tr>
                      <td colSpan={6}>No paydirect records found.</td>
                    </tr>
                  )}
                  {!loading &&
                    items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.A ?? "-"}</td>
                        <td>{item.NAMEMONTH_TH ?? item.B ?? "-"}</td>
                        <td>{formatBaht(item.TOTALINCOME)}</td>
                        <td>{formatBaht(item.TOTALOUTCOME)}</td>
                        <td>{formatBaht(item.BALANCE)}</td>
                        <td>
                          {item.PAYID ? (
                            <Link href={`/officers/paydirect/${item.PAYID}`}>View slip</Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={loading || page <= 1}
              onClick={() => loadPage(Math.max(1, page - 1))}
            >
              Prev
            </button>
            {pageWindow.map((p) => (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === page ? styles.currentPage : ""}`}
                disabled={loading}
                onClick={() => loadPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              disabled={loading || page >= totalPages}
              onClick={() => loadPage(Math.min(totalPages, page + 1))}
            >
              Next
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  useReloadOnPageSizeChange(pageSize, () => void loadPage(1));

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
      setTotal(json.total ?? 0);
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
    <div className="d-flex flex-column flex-grow-1">
      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <div className="mb-3">
          <h1 className="h4 mb-0">My PayDirect</h1>
          <p className="small text-secondary mb-0 mt-1">Salary slips available for your account</p>
        </div>

        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <div>
              <span>PayDirect list</span>
              {officer && (
                <div className="mb-3">
                  <div className="fs-5 fw-bold">{officer.name ?? officer.cid}</div>
                  <div className="d-flex flex-wrap gap-3 small text-secondary">
                    <span>{`CID: ${officer.cid}`}</span>
                    {officer.position && <span>{`Position: ${officer.position}`}</span>}
                    {officer.station && <span>{`Station: ${officer.station}`}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                Page {page} of {totalPages} • {items.length} items
              </span>
              <button className="btn btn-primary" type="button" onClick={() => loadPage(1)} disabled={loading}>
                Refresh
              </button>
              <button className="btn btn-outline-secondary" type="button" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="border rounded overflow-hidden bg-white">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
              <div className="fw-bold">Salary slips</div>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
                <thead className="table-light">
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
                        <td className="text-end text-nowrap">{formatBaht(item.TOTALINCOME)}</td>
                        <td className="text-end text-nowrap">{formatBaht(item.TOTALOUTCOME)}</td>
                        <td className="text-end text-nowrap">{formatBaht(item.BALANCE)}</td>
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

          {!error && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              disabled={loading}
              onPageChange={(p) => loadPage(p)}
              onPageSizeChange={setPageSize}
            />
          )}
        </section>
      </main>
    </div>
  );
}

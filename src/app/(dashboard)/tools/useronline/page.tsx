'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "../../officers/page.module.css";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";

type UserOnlineRow = {
  id: number | null;
  username: string | null;
  password: string | null;
  logined: string | null;
  ipv4: string | null;
  logindate: string | null;
};

type ApiResult = {
  items: UserOnlineRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const pageSize = 20;

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Bangkok",
  });
};

const maskPassword = (value: string | null) => {
  if (!value) return "-";
  const trimmed = value.trim();
  if (!trimmed) return "-";
  const visible = trimmed.slice(0, 4);
  const maskLength = Math.max(0, Math.min(8, trimmed.length - visible.length));
  const mask = "*".repeat(maskLength);
  const suffix = trimmed.length > visible.length + maskLength ? "..." : "";
  return `${visible}${mask}${suffix}`;
};

export default function UserOnlineReportPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    username: "",
    ipv4: "",
    logined: "",
    startDate: "",
    endDate: "",
  });

  const fetchLogs = async (targetPage: number, currentFilters: typeof filters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });

      if (currentFilters.username.trim()) params.set("username", currentFilters.username.trim());
      if (currentFilters.ipv4.trim()) params.set("ipv4", currentFilters.ipv4.trim());
      if (currentFilters.logined) params.set("logined", currentFilters.logined);
      if (currentFilters.startDate) params.set("startDate", currentFilters.startDate);
      if (currentFilters.endDate) params.set("endDate", currentFilters.endDate);

      const res = await fetch(`/api/useronline?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดรายงานได้");
        setData(null);
      } else {
        setData(json);
        setPage(targetPage);
      }
    } catch (_err) {
      setError("ไม่สามารถโหลดรายงานได้");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void fetchLogs(1, filters);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const displayRange = useMemo(() => {
    if (!data) return "0-0";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, data.total);
    return `${start}-${end}`;
  }, [data, page]);

  const pageWindow = useMemo(() => {
    if (!data) return [];
    const total = data.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [data, page]);

  const setFilterField =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className={styles.page}>
      <AppHeader activePath="/tools/useronline" />

      <main className={styles.main}>
        <div className={styles.titleArea}>
          <h1>รายงานการใช้งาน (useronline)</h1>
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>บันทึกการเข้าสู่ระบบ</span>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                Displaying {displayRange} of {data?.total ?? 0} records.
              </span>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>ผู้ใช้</th>
                  <th>รหัสผ่านที่ใช้</th>
                  <th>ผล</th>
                  <th>IP</th>
                  <th>วันที่/เวลา</th>
                </tr>
                <tr className={styles.filterRow}>
                  <th className={styles.filterSelectPlaceholder}> </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหา username"
                      value={filters.username}
                      onChange={setFilterField("username")}
                    />
                  </th>
                  <th />
                  <th>
                    <select className={styles.select} value={filters.logined} onChange={setFilterField("logined")}>
                      <option value="">ทั้งหมด</option>
                      <option value="Y">สำเร็จ</option>
                      <option value="N">ไม่สำเร็จ</option>
                    </select>
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหา IP"
                      value={filters.ipv4}
                      onChange={setFilterField("ipv4")}
                    />
                  </th>
                  <th>
                    <div style={{ display: "grid", gap: 4 }}>
                      <input
                        className={styles.filterInput}
                        type="date"
                        value={filters.startDate}
                        onChange={setFilterField("startDate")}
                        title="วันที่เริ่ม"
                      />
                      <input
                        className={styles.filterInput}
                        type="date"
                        value={filters.endDate}
                        onChange={setFilterField("endDate")}
                        title="วันที่สิ้นสุด"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6}>กำลังโหลด...</td>
                  </tr>
                )}
                {!loading && data?.items?.length === 0 && (
                  <tr>
                    <td className={styles.emptyState} colSpan={6}>
                      ไม่พบข้อมูลการใช้งาน
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.items?.map((row, idx) => (
                    <tr key={row.id ?? `${row.username}-${row.logindate}-${idx}`} className={idx % 2 === 1 ? styles.evenRow : undefined}>
                      <td>{(page - 1) * pageSize + idx + 1}</td>
                      <td>{row.username || "-"}</td>
                      <td title={row.password || "-"}>
                        <code>{maskPassword(row.password)}</code>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {row.logined === "Y" ? "สำเร็จ" : row.logined === "N" ? "ไม่สำเร็จ" : "-"}
                      </td>
                      <td>{row.ipv4 || "-"}</td>
                      <td>{formatDateTime(row.logindate)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={page <= 1 || loading} onClick={() => fetchLogs(page - 1, filters)}>
              Prev
            </button>
            {pageWindow.map((p) => (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === page ? styles.currentPage : ""}`}
                disabled={loading}
                onClick={() => fetchLogs(p, filters)}
              >
                {p}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              disabled={!data || page >= (data?.totalPages ?? 1) || loading}
              onClick={() => fetchLogs(page + 1, filters)}
            >
              Next
            </button>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

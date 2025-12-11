'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

type ReportRow = {
  CID: string;
  NAME: string | null;
  LPOS: string | null;
  STATION: string | null;
  MONTHTHAI: string;
  NAMEMONTH_TH: string | null;
  YEARTHAI: string;
  PAYNAME: string | null;
  INCOME: number;
  OUTCOME: number;
};

type ApiResult = {
  items: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalIncome: number;
  totalOutcome: number;
};

export default function ReportsAllPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null);
  const [filters, setFilters] = useState({
    cid: "",
    name: "",
    monththai: "",
    yearthai: "",
  });

  const pageSize = 10;

  const fetchData = async (targetPage: number, currentFilters: typeof filters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (currentFilters.cid.trim()) params.set("cid", currentFilters.cid.trim());
      if (currentFilters.name.trim()) params.set("name", currentFilters.name.trim());
      if (currentFilters.monththai.trim()) params.set("monththai", currentFilters.monththai.trim());
      if (currentFilters.yearthai.trim()) params.set("yearthai", currentFilters.yearthai.trim());

      const res = await fetch(`/api/reports/all?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดข้อมูลรายงานได้");
        setData(null);
      } else {
        setData(json);
        setPage(targetPage);
      }
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลรายงานได้");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchData(1, filters);
  };

  const handleReset = () => {
    const cleared = { cid: "", name: "", monththai: "", yearthai: "" };
    setFilters(cleared);
    setPage(1);
    void fetchData(1, cleared);
  };

  const displayRange = useMemo(() => {
    if (!data || data.total === 0) return "0-0";
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

  const onFilterChange =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLSelectElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const formatNumber = (value: number) =>
    Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openDetail = (row: ReportRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailRow(null);
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/reports" />

      <main className={styles.main}>
        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>รายงานทั้งหมด</span>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                แสดง {displayRange} จากทั้งหมด {data?.total ?? 0} รายการ
              </span>
              <div className={styles.headButtons}>
                <button type="submit" form="report-filter-form" className={styles.primaryBtn} disabled={loading}>
                  {loading ? "กำลังค้นหา..." : "ค้นหา"}
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleReset}
                  disabled={loading}
                >
                  ล้าง
                </button>
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form id="report-filter-form" className={styles.filterForm} onSubmit={handleSearch}>
            <div className={styles.filtersRow}>
              <div className={styles.filterField}>
                <label htmlFor="cid">CID</label>
                <input
                  id="cid"
                  className={styles.filterInput}
                  placeholder="ค้นหา CID"
                  value={filters.cid}
                  onChange={onFilterChange("cid")}
                />
              </div>
              <div className={styles.filterField}>
                <label htmlFor="name">ชื่อ-นามสกุล</label>
                <input
                  id="name"
                  className={styles.filterInput}
                  placeholder="ค้นหาชื่อ-นามสกุล"
                  value={filters.name}
                  onChange={onFilterChange("name")}
                />
              </div>
              <div className={styles.filterField}>
                <label htmlFor="monththai">เดือน</label>
                <select
                  id="monththai"
                  className={styles.filterInput}
                  value={filters.monththai}
                  onChange={onFilterChange("monththai")}
                >
                  <option value="">ทุกเดือน</option>
                  <option value="01">มกราคม</option>
                  <option value="02">กุมภาพันธ์</option>
                  <option value="03">มีนาคม</option>
                  <option value="04">เมษายน</option>
                  <option value="05">พฤษภาคม</option>
                  <option value="06">มิถุนายน</option>
                  <option value="07">กรกฎาคม</option>
                  <option value="08">สิงหาคม</option>
                  <option value="09">กันยายน</option>
                  <option value="10">ตุลาคม</option>
                  <option value="11">พฤศจิกายน</option>
                  <option value="12">ธันวาคม</option>
                </select>
              </div>
              <div className={styles.filterField}>
                <label htmlFor="yearthai">ปี (YYYY)</label>
                <input
                  id="yearthai"
                  className={styles.filterInput}
                  placeholder="YYYY"
                  value={filters.yearthai}
                  onChange={onFilterChange("yearthai")}
                />
              </div>
            </div>
          </form>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>CID</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>ตำแหน่ง</th>
                  <th>หน่วยงาน</th>
                  <th>เดือน</th>
                  <th>ปี</th>
                  <th>PAYNAME</th>
                  <th>รายรับ</th>
                  <th>รายจ่าย</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row) => (
                  <tr key={`${row.CID}-${row.YEARTHAI}-${row.MONTHTHAI}`}>
                    <td>{row.CID}</td>
                    <td>{row.NAME}</td>
                    <td>{row.LPOS ?? "-"}</td>
                    <td>{row.STATION}</td>
                    <td>{row.NAMEMONTH_TH ?? row.MONTHTHAI}</td>
                    <td>{row.YEARTHAI}</td>
                    <td>{row.PAYNAME ?? "-"}</td>
                    <td className={styles.numberCell}>{formatNumber(row.INCOME)}</td>
                    <td className={styles.numberCell}>{formatNumber(row.OUTCOME)}</td>
                    <td className={styles.actionsCell}>
                      <button className={styles.linkBtn} type="button" onClick={() => openDetail(row)}>
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={9} className={styles.emptyState}>
                      {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <div className={styles.summaryBar}>
              <div className={styles.summaryItem}>
                <span>รวมรายรับ</span>
                <strong>{formatNumber(data.totalIncome)}</strong>
              </div>
              <div className={styles.summaryItem}>
                <span>รวมรายจ่าย</span>
                <strong>{formatNumber(data.totalOutcome)}</strong>
              </div>
            </div>
          )}

          {data && data.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => fetchData(Math.max(page - 1, 1), filters)}
                disabled={page === 1 || loading}
              >
                &lt; ก่อนหน้า
              </button>
              {pageWindow.map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === page ? styles.currentPage : ""}`}
                  onClick={() => fetchData(p, filters)}
                  disabled={p === page || loading}
                >
                  {p}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                onClick={() => fetchData(Math.min(page + 1, data.totalPages), filters)}
                disabled={page === data.totalPages || loading}
              >
                ถัดไป &gt;
              </button>
            </div>
          )}
        </section>
      </main>

      {detailOpen && detailRow && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>รายละเอียดรายการ</h2>
              <button className={styles.modalClose} onClick={closeDetail} aria-label="Close">
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <table className={styles.detailTable}>
                <tbody>
                  <tr>
                    <th>CID</th>
                    <td>{detailRow.CID}</td>
                  </tr>
                  <tr>
                    <th>ชื่อ-นามสกุล</th>
                    <td>{detailRow.NAME}</td>
                  </tr>
                  <tr>
                    <th>Station</th>
                    <td>{detailRow.STATION}</td>
                  </tr>
                  <tr>
                    <th>ตำแหน่ง</th>
                    <td>{detailRow.LPOS ?? "-"}</td>
                  </tr>
                  <tr>
                    <th>เดือน</th>
                    <td>{detailRow.NAMEMONTH_TH ?? detailRow.MONTHTHAI}</td>
                  </tr>
                  <tr>
                    <th>ปี</th>
                    <td>{detailRow.YEARTHAI}</td>
                  </tr>
                  <tr>
                    <th>รายรับ</th>
                    <td>{formatNumber(detailRow.INCOME)}</td>
                  </tr>
                  <tr>
                    <th>รายจ่าย</th>
                    <td>{formatNumber(detailRow.OUTCOME)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

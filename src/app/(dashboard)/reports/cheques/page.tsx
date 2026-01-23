'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import styles from "./page.module.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

type ChequeReportRow = {
  ACCNUMBER: string;
  CHEQUE: string;
  PAYDATE: string | null;
  PNUMBER: string;
  NODEEGAR: string;
  MONEY: number;
};

type ApiResult = {
  items: ChequeReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const BANGKOK_TIMEZONE = "Asia/Bangkok";
const pageSize = 1000;

export default function ReportChequeSearchPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ cheque: "" });
  const [chequeOptions, setChequeOptions] = useState<string[]>([]);
  const [chequeQuery, setChequeQuery] = useState("");

  const onChequeFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, cheque: value }));
    setChequeQuery(value);
  };

  const loadChequeOptions = async (query: string) => {
    try {
      const trimmed = query.trim();
      const params = new URLSearchParams({
        page: "1",
        pageSize: "10",
        recent: "1",
      });
      if (trimmed.length >= 2) {
        params.set("cheque", trimmed);
      }
      const res = await fetch(`/api/cheques?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.items)) {
        setChequeOptions([]);
        return;
      }
      const items = (json.items as { CHEQUE?: string }[])
        .map((item) => String(item.CHEQUE || "").trim())
        .filter(Boolean);
      setChequeOptions(Array.from(new Set(items)));
    } catch {
      setChequeOptions([]);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadChequeOptions(chequeQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [chequeQuery]);

  const fetchData = async (currentFilters: typeof filters = filters) => {
    setLoading(true);
    setError(null);
    const trimmedCheque = currentFilters.cheque.trim();
    if (!trimmedCheque) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: String(pageSize),
      });
      params.set("cheque", trimmedCheque);

      const res = await fetch(`/api/salaries/cheques?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดข้อมูลค้นหาเช็คได้");
        setData(null);
      } else {
        setData(json);
      }
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลค้นหาเช็คได้");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    void fetchData(filters);
  };

  const handleReset = () => {
    const cleared = { cheque: "" };
    setFilters(cleared);
    void fetchData(cleared);
  };

  const displayRange = useMemo(() => {
    if (!data || data.total === 0) return "0-0";
    return `1-${data.total}`;
  }, [data]);

  const totals = useMemo(
    () =>
      (data?.items || []).reduce(
        (acc, row) => {
          acc.money += Number(row.MONEY ?? 0);
          return acc;
        },
        { money: 0 },
      ),
    [data],
  );

  const formatNumber = (value: number | null | undefined) =>
    Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: BANGKOK_TIMEZONE,
    });
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/reports/cheques" />

      <main className={styles.main}>
        <section className={styles.tableCard}>
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <div className={styles.inputGroup}>
              <label className={styles.inlineLabel} htmlFor="cheque">
                เลขที่เช็ค :
              </label>
              <input
                id="cheque"
                className={styles.searchInput}
                value={filters.cheque}
                list="chequeOptions"
                onChange={onChequeFilterChange}
                onFocus={(e) => {
                  void loadChequeOptions(e.currentTarget.value);
                }}
                placeholder="ระบุเลขที่เช็ค"
              />
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.findBtn} disabled={loading}>
                {loading ? "กำลังค้นหา..." : "FIND"}
              </button>
              <button type="button" className={styles.resetBtn} onClick={handleReset} disabled={loading}>
                ล้างค่า
              </button>
            </div>
            <span className={styles.resultText}>
              Total {data?.total ?? 0} result{(data?.total || 0) === 1 ? "" : "s"}. แสดง {displayRange}
            </span>
          </form>
          <datalist id="chequeOptions">
            {chequeOptions.map((cheque) => (
              <option key={cheque} value={cheque} />
            ))}
          </datalist>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ACCNUMBER</th>
                  <th>CHEQUE</th>
                  <th>PAYDATE</th>
                  <th>PNUMBER</th>
                  <th>NODEEGAR</th>
                  <th>จำนวนจ่าย</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row, idx) => (
                  <tr key={`${row.CHEQUE}-${row.PNUMBER}-${row.NODEEGAR}-${idx}`}>
                    <td>{row.ACCNUMBER}</td>
                    <td>{row.CHEQUE}</td>
                    <td>{formatDate(row.PAYDATE)}</td>
                    <td>{row.PNUMBER}</td>
                    <td>{row.NODEEGAR}</td>
                    <td className={styles.moneyCell}>{formatNumber(row.MONEY)}</td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>
                      {loading ? "กำลังค้นหา..." : "No results found."}
                    </td>
                  </tr>
                )}
              </tbody>
              {data?.items?.length ? (
                <tfoot>
                  <tr>
                    <td className={styles.totalLabel} colSpan={5}>
                      Total:
                    </td>
                    <td className={styles.moneyCell}>{formatNumber(totals.money)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

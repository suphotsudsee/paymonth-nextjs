'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import styles from "./page.module.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

type DeegarSalaryRow = {
  ID: number;
  PNUMBER: string;
  NODEEGAR: string;
  NUM: string | null;
  CID: string;
  IDBANK: string | null;
  CHEQUE: string | null;
  PAYDATE: string | null;
  NAME: string | null;
  MONEY: number | null;
  TAX: number | null;
  PAY: number | null;
};

type ApiResult = {
  items: DeegarSalaryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const pageSize = 1000;

export default function ReportDeegarSearchPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ pnumber: "", nodeegar: "" });
  const [pnumberOptions, setPnumberOptions] = useState<string[]>([]);
  const [pnumberQuery, setPnumberQuery] = useState("");

  const onFilterChange =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const onPnumberFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, pnumber: value }));
    setPnumberQuery(value);
  };

  const loadPnumberOptions = async (query: string) => {
    try {
      const trimmed = query.trim();
      const params = new URLSearchParams({
        page: "1",
        pageSize: "10",
        pnumberOnly: "1",
        recent: "1",
      });
      if (trimmed.length >= 2) {
        params.set("pnumber", trimmed);
      }
      const res = await fetch(`/api/deegars?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.items)) {
        setPnumberOptions([]);
        return;
      }
      const items = (json.items as { PNUMBER?: string }[])
        .map((item) => String(item.PNUMBER || "").trim())
        .filter(Boolean);
      setPnumberOptions(Array.from(new Set(items)));
    } catch {
      setPnumberOptions([]);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadPnumberOptions(pnumberQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [pnumberQuery]);
  const fetchData = async (currentFilters: typeof filters = filters) => {
    setLoading(true);
    setError(null);
    const trimmedPnumber = currentFilters.pnumber.trim();
    if (!trimmedPnumber) {
      setData(null);
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: String(pageSize),
      });
      params.set("pnumber", trimmedPnumber);
      if (currentFilters.nodeegar.trim()) params.set("nodeegar", currentFilters.nodeegar.trim());

      const res = await fetch(`/api/salaries/deegars?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดข้อมูลค้นหาฎีกาได้");
        setData(null);
      } else {
        setData(json);
      }
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลค้นหาฎีกาได้");
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
    const cleared = { pnumber: "", nodeegar: "" };
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
          acc.tax += Number(row.TAX ?? 0);
          acc.pay += Number(row.PAY ?? 0);
          return acc;
        },
        { money: 0, tax: 0, pay: 0 },
      ),
    [data],
  );

  const formatNumber = (value: number | null | undefined) =>
    Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/reports/deegars" />

      <main className={styles.main}>
        <section className={styles.tableCard}>
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <div className={styles.inputGroup}>
              <label className={styles.inlineLabel} htmlFor="pnumber">
                เลขที่ฎีกา :
              </label>
              <input
                id="pnumber"
                className={styles.searchInput}
                value={filters.pnumber}
                list="pnumberOptions"
                onChange={onPnumberFilterChange}
                onFocus={(e) => {
                  void loadPnumberOptions(e.currentTarget.value);
                }}
                placeholder="ระบุเลขที่ฎีกา"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inlineLabel} htmlFor="nodeegar">
                NODEEGAR :
              </label>
              <input
                id="nodeegar"
                className={styles.searchInput}
                value={filters.nodeegar}
                onChange={onFilterChange("nodeegar")}
                placeholder="ระบุ NODEEGAR"
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
          <datalist id="pnumberOptions">
            {pnumberOptions.map((pnumber) => (
              <option key={pnumber} value={pnumber} />
            ))}
          </datalist>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>PNUMBER</th>
                  <th>NODEEGAR</th>
                  <th>NUM</th>
                  <th>salary-CID</th>
                  <th>IDBANK</th>
                  <th>CHEQUE</th>
                  <th>PAYDATE</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>รายรับ</th>
                  <th>คืนเงินบำรุง สสจ.</th>
                  <th>คืนเงินทดรองรายการ</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row, idx) => (
                  <tr key={`${row.PNUMBER}-${row.NODEEGAR}-${row.CID}-${idx}`}>
                    <td className={styles.numberCell}>{idx + 1}</td>
                    <td>{row.PNUMBER}</td>
                    <td>{row.NODEEGAR}</td>
                    <td>{row.NUM ?? "-"}</td>
                    <td>{row.CID}</td>
                    <td>{row.IDBANK ?? "-"}</td>
                    <td>{row.CHEQUE ?? "-"}</td>
                    <td>{formatDate(row.PAYDATE)}</td>
                    <td>{row.NAME ?? "-"}</td>
                    <td className={styles.moneyCell}>{formatNumber(row.MONEY)}</td>
                    <td className={styles.moneyCell}>{formatNumber(row.TAX)}</td>
                    <td className={styles.moneyCell}>{formatNumber(row.PAY)}</td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={12} className={styles.emptyState}>
                      {loading ? "กำลังค้นหา..." : "ไม่พบข้อมูล"}
                    </td>
                  </tr>
                )}
              </tbody>
              {data?.items?.length ? (
                <tfoot>
                  <tr>
                    <td className={styles.totalLabel} colSpan={9}>
                      Total:
                    </td>
                    <td className={styles.totalCell}>{formatNumber(totals.money)}</td>
                    <td className={styles.totalCell}>{formatNumber(totals.tax)}</td>
                    <td className={styles.totalCell}>{formatNumber(totals.pay)}</td>
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

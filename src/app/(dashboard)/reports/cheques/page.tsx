'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Pagination } from "@/components/Pagination";
import { pageRange } from "@/lib/pagination";

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
  /** ยอดรวมของผลค้นหาทั้งหมด จาก API (PRD 11.1) */
  totals?: { money: number };
};

const BANGKOK_TIMEZONE = "Asia/Bangkok";

export default function ReportChequeSearchPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  // ค่าเริ่มต้น 50 = เท่ากับจำนวนแถวที่หน้านี้ได้จริงก่อนแบ่งหน้า (API ตัดที่ 50)
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState({ cheque: "" });
  // ตัวกรองของการค้นหาครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า
  // (ไม่ใช้ค่าที่พิมพ์ค้างในฟอร์มแต่ยังไม่กดค้นหา — Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);
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

  const fetchData = async (currentFilters: typeof filters = filters, targetPage = 1, targetSize = pageSize) => {
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
        page: String(targetPage),
        pageSize: String(targetSize),
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
        setAppliedFilters(currentFilters);
        setPage(targetPage);
        setPageSize(targetSize);
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
    const { from, to } = pageRange(page, pageSize, data?.total ?? 0);
    return `${from}-${to}`;
  }, [data, page, pageSize]);

  // ยอดรวมทั้งผลค้นหาจาก API (เดิมรวมเฉพาะแถวที่โหลดมา ซึ่ง API ฎีกาตัดไว้ 50 แถว → ยอดขาด)
  const totals = data?.totals ?? { money: 0 };

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
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/reports/cheques" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <form className="card-header d-flex flex-wrap align-items-center gap-2" onSubmit={handleSearch}>
            <div className="d-flex align-items-center gap-2 fw-semibold">
              <label className="text-nowrap mb-0" htmlFor="cheque">
                เลขที่เช็ค :
              </label>
              <input
                id="cheque"
                className="form-control"
                value={filters.cheque}
                list="chequeOptions"
                onChange={onChequeFilterChange}
                onFocus={(e) => {
                  void loadChequeOptions(e.currentTarget.value);
                }}
                placeholder="ระบุเลขที่เช็ค"
              />
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "กำลังค้นหา..." : "FIND"}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={loading}>
                ล้างค่า
              </button>
            </div>
            <span className="small text-secondary fw-semibold">
              Total {data?.total ?? 0} result{(data?.total || 0) === 1 ? "" : "s"}. แสดง {displayRange}
            </span>
          </form>
          <datalist id="chequeOptions">
            {chequeOptions.map((cheque) => (
              <option key={cheque} value={cheque} />
            ))}
          </datalist>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
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
                    <td className="text-end text-nowrap fw-semibold">{formatNumber(row.MONEY)}</td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={6} className="text-center text-secondary p-3">
                      {loading ? "กำลังค้นหา..." : "No results found."}
                    </td>
                  </tr>
                )}
              </tbody>
              {data?.items?.length ? (
                <tfoot>
                  <tr>
                    <td className="text-end fw-bold" colSpan={5}>
                      Total:
                    </td>
                    <td className="text-end text-nowrap fw-semibold">{formatNumber(totals.money)}</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          {data && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={pageSize}
              disabled={loading}
              onPageChange={(p) => fetchData(appliedFilters, p, pageSize)}
              onPageSizeChange={(n) => void fetchData(appliedFilters, 1, n)}
            />
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

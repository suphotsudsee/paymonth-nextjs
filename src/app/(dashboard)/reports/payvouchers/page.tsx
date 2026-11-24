'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { FileSpreadsheet } from 'lucide-react';
import { Pagination } from '@/components/Pagination';

type Item = {
  PAYDATE: string | null;
  ID: number;
  CHEQUE: string;
  CHEQUENAME: string;
  NAME: string;
  PAYNAME: string;
  PNUMBER: string;
  MONEY: number;
};

type ApiResult = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalMoney?: number;
};

const BANGKOK_TIMEZONE = "Asia/Bangkok";

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
};

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PayVouchersPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    startdate: '',
    enddate: '',
    field: 'pnumber',
    query: '',
  });
  // ตัวกรองของการค้นหาครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า
  // (ไม่ใช้ค่าที่พิมพ์ค้างในฟอร์มแต่ยังไม่กดค้นหา — Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);
  // ส่งออก Excel ตามการค้นหาครั้งล่าสุดที่แสดงอยู่ (ไม่ใช่ค่าที่พิมพ์ค้างในฟอร์ม) — ต้องมีช่วงวันที่ (PRD 12)
  const canExport = Boolean(data && appliedFilters.startdate.trim() && appliedFilters.enddate.trim());
  const exportHref = canExport
    ? `/api/reports/payvouchers/export?${new URLSearchParams({
        startdate: appliedFilters.startdate.trim(),
        enddate: appliedFilters.enddate.trim(),
        field: appliedFilters.field,
        ...(appliedFilters.query.trim() ? { query: appliedFilters.query.trim() } : {}),
      }).toString()}`
    : undefined;
  const [chequeOptions, setChequeOptions] = useState<string[]>([]);
  const [pnumberOptions, setPnumberOptions] = useState<string[]>([]);

  const fetchData = async (
    targetPage: number,
    targetSize: number = pageSize,
    currentFilters: typeof filters = filters,
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (!currentFilters.startdate.trim() || !currentFilters.enddate.trim()) {
        setData(null);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(targetSize),
      });
      if (currentFilters.startdate.trim()) params.set('startdate', currentFilters.startdate.trim());
      if (currentFilters.enddate.trim()) params.set('enddate', currentFilters.enddate.trim());
      if (currentFilters.field) params.set('field', currentFilters.field);
      if (currentFilters.query.trim()) params.set('query', currentFilters.query.trim());

      const res = await fetch(`/api/reports/payvouchers?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      }
      setData(json);
      setAppliedFilters(currentFilters);
      setPage(targetPage);
      setPageSize(targetSize);
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Do not auto-fetch until dates set
  }, []);

  const displayRange = useMemo(() => {
    if (!data || data.total === 0) return '0-0';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, data.total);
    return `${start}-${end}`;
  }, [data, page, pageSize]);


  const onFilterChange =
    (field: keyof typeof filters) =>
      (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setFilters((prev) => ({ ...prev, [field]: value }));
      };

  const loadChequeOptions = async (query: string) => {
    try {
      const trimmed = query.trim();
      const params = new URLSearchParams({
        page: '1',
        pageSize: '10',
        recent: '1',
      });
      if (trimmed.length >= 2) {
        params.set('cheque', trimmed);
      }
      const res = await fetch(`/api/cheques?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.items)) {
        setChequeOptions([]);
        return;
      }
      const items = (json.items as { CHEQUE?: string }[])
        .map((item) => String(item.CHEQUE || '').trim())
        .filter(Boolean);
      setChequeOptions(Array.from(new Set(items)));
    } catch {
      setChequeOptions([]);
    }
  };

  const loadPnumberOptions = async (query: string) => {
    try {
      const trimmed = query.trim();
      const params = new URLSearchParams({
        page: '1',
        pageSize: '10',
        pnumberOnly: '1',
        recent: '1',
      });
      if (trimmed.length >= 2) {
        params.set('pnumber', trimmed);
      }
      const res = await fetch(`/api/deegars?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.items)) {
        setPnumberOptions([]);
        return;
      }
      const items = (json.items as { PNUMBER?: string }[])
        .map((item) => String(item.PNUMBER || '').trim())
        .filter(Boolean);
      setPnumberOptions(Array.from(new Set(items)));
    } catch {
      setPnumberOptions([]);
    }
  };

  useEffect(() => {
    if (filters.field !== 'cheque') {
      setChequeOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      void loadChequeOptions(filters.query);
    }, 250);
    return () => clearTimeout(handle);
  }, [filters.field, filters.query]);

  useEffect(() => {
    if (filters.field !== 'pnumber') {
      setPnumberOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      void loadPnumberOptions(filters.query);
    }, 250);
    return () => clearTimeout(handle);
  }, [filters.field, filters.query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchData(1, pageSize);
  };

  const handleReset = () => {
    const cleared = { startdate: '', enddate: '', field: 'pnumber', query: '' };
    setFilters(cleared);
    setPage(1);
    setData(null);
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/reports/payvouchers" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <div className="d-flex flex-column gap-1">
              <h1 className="h5 mb-0">ทะเบียนคุมหลักฐานการจ่าย</h1>
              <p className="small text-secondary mb-0">ค้นหาหลักฐานการจ่ายตามช่วงวันที่และเงื่อนไข</p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="small text-secondary fw-semibold">
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'ยังไม่ค้นหา'}
                </span>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <button
                    type="submit"
                    form="payvouchers-filter-form"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
                  </button>
                  <a
                    className={`btn btn-success d-inline-flex align-items-center gap-2${canExport && !loading ? '' : ' disabled'}`}
                    href={exportHref}
                    aria-disabled={!canExport || loading}
                    title={canExport ? 'ส่งออกทุกแถวของการค้นหานี้เป็น Excel' : 'ค้นหาด้วยช่วงวันที่ก่อนส่งออก Excel'}
                  >
                    {/* 16px = ขนาดไอคอนในปุ่มเดิมบน server */}
                    <FileSpreadsheet size={16} aria-hidden />
                    <span>ส่งออก Excel</span>
                  </a>
                  <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={loading}>
                    ล้างข้อมูล
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form id="payvouchers-filter-form" className="px-3 pt-3 pb-2 border-bottom bg-light" onSubmit={handleSearch}>
            <div className="row g-2 align-items-end">
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>จากวันที่</span>
                <input
                  type="date"
                  value={filters.startdate}
                  onChange={onFilterChange('startdate')}
                  className="form-control form-control-sm"
                />
              </label>
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>ถึงวันที่</span>
                <input
                  type="date"
                  value={filters.enddate}
                  onChange={onFilterChange('enddate')}
                  className="form-control form-control-sm"
                />
              </label>
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>ค้นด้วย</span>
                <select value={filters.field} onChange={onFilterChange('field')} className="form-select">
                  <option value="pnumber">ที่ฏีกา</option>
                  <option value="cheque">CHEQUE</option>
                  <option value="payname">รายการจ่าย</option>
                  <option value="name">จ่ายให้</option>
                </select>
              </label>
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>คำค้น</span>
                <input
                  value={filters.query}
                  onChange={onFilterChange('query')}
                  className="form-control form-control-sm"
                  placeholder="พิมพ์คำค้น"
                  list={filters.field === 'cheque' ? 'chequeOptions' : filters.field === 'pnumber' ? 'pnumberOptions' : undefined}
                  onFocus={(e) => {
                    if (filters.field === 'cheque') {
                      void loadChequeOptions(e.currentTarget.value);
                    }
                    if (filters.field === 'pnumber') {
                      void loadPnumberOptions(e.currentTarget.value);
                    }
                  }}
                />
              </label>
            </div>
          </form>
          <datalist id="chequeOptions">
            {chequeOptions.map((cheque) => (
              <option key={cheque} value={cheque} />
            ))}
          </datalist>
          <datalist id="pnumberOptions">
            {pnumberOptions.map((pnumber) => (
              <option key={pnumber} value={pnumber} />
            ))}
          </datalist>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>วดป/จ่าย</th>
                  <th>ลำดับที่</th>
                  <th>หมายเลขเช็ค</th>
                  <th>รายการเช็ค</th>
                  <th>จ่ายให้</th>
                  <th>รายการจ่าย</th>
                  <th>ที่ฎีกา</th>
                  <th>จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={8} className="text-center text-primary fw-semibold p-3">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}
                {data?.items.map((row, idx) => (
                  <tr key={`${row.ID}-${row.CHEQUE}-${row.PNUMBER}-${row.PAYDATE || ''}-${idx}`}>
                    <td>{formatDate(row.PAYDATE)}</td>
                    <td>{row.ID}</td>
                    <td>{row.CHEQUE}</td>
                    <td>{row.CHEQUENAME}</td>
                    <td>{row.NAME}</td>
                    <td>{row.PAYNAME}</td>
                    <td>{row.PNUMBER}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.MONEY)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="text-center text-secondary p-3">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data && (

            <div className="d-flex flex-wrap justify-content-end gap-4 px-3 py-2 border-top bg-light fw-bold small">
              <span>
                รวมจำนวนเงิน <strong>{formatMoney(data.totalMoney ?? 0)}</strong>
              </span>
            </div>

          )}
          {data && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={pageSize}
              disabled={loading}
              onPageChange={(p) => fetchData(p, pageSize, appliedFilters)}
              onPageSizeChange={(n) => void fetchData(1, n, appliedFilters)}
            />
          )}

        </section>
      </main>

      <AppFooter />
    </div>
  );
}

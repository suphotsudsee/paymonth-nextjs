'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { Pagination } from '@/components/Pagination';

type Item = {
  PAYDATE: string | null;
  ID: number;
  CHEQUE: string;
  CHEQUENAME: string;
  NAME: string;
  PAYNAME: string;
  PNUMBER: string;
  NODEEGAR: string;
  MONEY: number;
  CID: string;
  IDBANK: string;
  ACCNAME: string;
  EMAIL: string;
  MOBILE: string;
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

export default function KtbDeegarPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    pnumber: '',
    nodeegar: '',
  });
  // ตัวกรองของการค้นหาครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า
  // (ไม่ใช้ค่าที่พิมพ์ค้างในฟอร์มแต่ยังไม่กดค้นหา — Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchData = async (
    targetPage: number,
    targetSize: number = pageSize,
    currentFilters: typeof filters = filters,
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (!currentFilters.pnumber.trim() || !currentFilters.nodeegar.trim()) {
        setData(null);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(targetSize),
        pnumber: currentFilters.pnumber.trim(),
        nodeegar: currentFilters.nodeegar.trim(),
      });

      const res = await fetch(`/api/reports/ktbdeegar?${params.toString()}`, {
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
    // wait for search
  }, []);

  const displayRange = useMemo(() => {
    if (!data || data.total === 0) return '0-0';
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, data.total);
    return `${start}-${end}`;
  }, [data, page, pageSize]);

  const onFilterChange =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFilters((prev) => ({ ...prev, [field]: value }));
    };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchData(1, pageSize);
  };

  const handleReset = () => {
    const cleared = { pnumber: '', nodeegar: '' };
    setFilters(cleared);
    setPage(1);
    setData(null);
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/reports/ktbdeegar" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <div className="d-flex flex-column gap-1">
              <h1 className="h5 mb-0">ส่งกรุงไทย (ฎีกา)</h1>
              <p className="small text-secondary mb-0">ค้นหาด้วยเลขที่ฎีกาและ NODEEGAR</p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="small text-secondary fw-semibold">
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'ยังไม่ค้นหา'}
                </span>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <button
                    type="submit"
                    form="ktbcheque-filter-form"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={loading}>
                    ล้างข้อมูล
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form id="ktbcheque-filter-form" className="px-3 pt-3 pb-2 border-bottom bg-light" onSubmit={handleSearch}>
            <div className="row g-2 align-items-end">
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>เลขที่ฎีกา</span>
                <input
                  value={filters.pnumber}
                  onChange={onFilterChange('pnumber')}
                  className="form-control form-control-sm"
                  placeholder=""
                />
              </label>
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>NODEEGAR</span>
                <input
                  value={filters.nodeegar}
                  onChange={onFilterChange('nodeegar')}
                  className="form-control form-control-sm"
                  placeholder=""
                />
              </label>
            </div>
          </form>

          {error && <div className="small text-secondary fw-semibold">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>Receiving Bank Code</th>
                  <th>Receiving A/C No.</th>
                  <th>Receiver Name</th>
                  <th>Transfer Amount</th>
                  <th>Citizen ID/Tax ID</th>
                  <th>DDA Ref</th>
                  <th>Reference No./ DDA Ref 2</th>
                  <th>EMAIL</th>
                  <th>MOBILE</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={9} className="text-center text-primary fw-semibold p-3">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}
                {data?.items.map((row) => (
                  <tr key={`${row.ID}-${row.PNUMBER}-${row.NODEEGAR}`}>
                    <td>{row.IDBANK}</td>
                    <td>{row.ACCNAME}</td>
                    <td>{row.NAME}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.MONEY)}</td>
                    <td>{row.CID}</td>
                    <td>{row.CHEQUE}</td>
                    <td>
                      {row.PNUMBER}/{row.NODEEGAR}
                    </td>
                    <td>{row.EMAIL}</td>
                    <td>{row.MOBILE}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className="text-center text-secondary p-3">
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

        <a
          className="d-inline-block m-3 small link-primary"
          href={
            filters.pnumber.trim() && filters.nodeegar.trim()
              ? `/api/reports/ktbdeegar/export?pnumber=${encodeURIComponent(filters.pnumber.trim())}&nodeegar=${encodeURIComponent(filters.nodeegar.trim())}`
              : '#'
          }
          onClick={(e) => {
            if (!filters.pnumber.trim() || !filters.nodeegar.trim()) {
              e.preventDefault();
              alert('กรุณากรอกเลขที่ฎีกาและ NODEEGAR ก่อนส่งออก');
            }
          }}
        >
          ส่งออกเป็น Excel
        </a>
      </main>

      <AppFooter />
    </div>
  );
}

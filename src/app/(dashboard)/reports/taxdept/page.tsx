'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { Pagination } from '@/components/Pagination';

type Item = {
  ID: number;
  CID: string;
  NAME: string;
  NAMESTATION: string;
  YEARTHAI: string;
  SUMMONEY: number;
  TAX: number;
};

type ApiResult = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalIncome: number;
  totalTax: number;
};

type Station = { CODE: string; NAMESTATION: string | null };

const thaiYear = () => new Date().getFullYear() + 543;

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReportsTaxDeptPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    yearthai: '',
    station: '',
  });
  // ตัวกรองของการค้นหาครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า
  // (ไม่ใช้ค่าที่พิมพ์ค้างในฟอร์มแต่ยังไม่กดค้นหา — Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchStations = async () => {
    try {
      const res = await fetch('/api/stations', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      setStations(json.stations || []);
    } catch {
      // ignore
    }
  };

  const fetchData = async (
    targetPage: number,
    targetSize: number = pageSize,
    currentFilters: typeof filters = filters,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(targetSize),
      });
      if (currentFilters.yearthai.trim()) params.set('yearthai', currentFilters.yearthai.trim());
      if (currentFilters.station.trim()) params.set('station', currentFilters.station.trim());

      const res = await fetch(`/api/reports/taxdept?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      }
      setData(json);
      setAppliedFilters(currentFilters);
      // If yearthai was blank and API supplied one (latest), sync it back into the input.
      if (!currentFilters.yearthai && json.items?.length) {
        setFilters((prev) => ({ ...prev, yearthai: json.items[0].YEARTHAI || '' }));
      }
      setPage(targetPage);
      setPageSize(targetSize);
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStations();
    void fetchData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchData(1, pageSize);
  };

  const handleReset = () => {
    const cleared = { yearthai: '', station: '' };
    setFilters(cleared);
    setPage(1);
    void fetchData(1, pageSize, cleared);
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/reports/taxdept" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <div className="d-flex flex-column gap-1">
              <h1 className="h5 mb-0">สรุปภาษี (ฝ่าย)</h1>
              <p className="small text-secondary mb-0">รวมเงินได้และภาษี แยกตามหน่วยงาน</p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="small text-secondary fw-semibold">
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'กำลังโหลด...'}
                </span>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <button
                    type="submit"
                    form="taxdept-filter-form"
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

          <form id="taxdept-filter-form" className="px-3 pt-3 pb-2 border-bottom bg-light" onSubmit={handleSearch}>
            <div className="row g-2 align-items-end">
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>ปีภาษี (พ.ศ.)</span>
                <input
                  type="text"
                  value={filters.yearthai}
                  onChange={onFilterChange('yearthai')}
                  className="form-control form-control-sm"
                  placeholder="เช่น 2568"
                />
              </label>
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>สถานที่ปฏิบัติงาน</span>
                <select
                  value={filters.station}
                  onChange={onFilterChange('station')}
                  className="form-select"
                >
                  <option value="">สถานที่ปฏิบัติงาน</option>
                  {stations.map((s) => (
                    <option key={s.CODE} value={s.NAMESTATION || ''}>
                      {s.NAMESTATION || s.CODE}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </form>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>CID</th>
                  <th>NAME</th>
                  <th>NAMESTATION</th>
                  <th>YEARTHAI</th>
                  <th>รวมเงินได้</th>
                  <th>รวมภาษี</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={7} className="text-center text-primary fw-semibold p-3">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}
                {data?.items.map((row) => (
                  <tr key={row.ID}>
                    <td>{row.ID}</td>
                    <td>{row.CID}</td>
                    <td>{row.NAME}</td>
                    <td>{row.NAMESTATION}</td>
                    <td>{row.YEARTHAI}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.SUMMONEY)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.TAX)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="text-center text-secondary p-3">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 px-3 py-2 border-top bg-light small">
              <div className="d-flex flex-wrap gap-3">
                <span>
                  Total รวมเงินได้: <strong>{formatMoney(data.totalIncome)}</strong>
                </span>
                <span>
                  Total ภาษี: <strong>{formatMoney(data.totalTax)}</strong>
                </span>
              </div>
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

        <div className="px-3 py-2 small">
          <a
            className="link-primary me-3"
            href={`/reports/taxdept/group?yearthai=${encodeURIComponent(filters.yearthai)}&station=${encodeURIComponent(filters.station)}`}
          >
            หนังสือรับรองภาษีรายกลุ่ม
          </a>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

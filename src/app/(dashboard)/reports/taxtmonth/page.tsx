'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { Pagination } from '@/components/Pagination';

type Item = {
  PAYNAME: string;
  YEARTHAI: string;
  m01: number;
  m02: number;
  m03: number;
  m04: number;
  m05: number;
  m06: number;
  m07: number;
  m08: number;
  m09: number;
  m10: number;
  m11: number;
  m12: number;
  allmonth: number;
};

type ApiResult = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totals: Record<string, number>;
  stationName: string;
  yearthai: string;
};

const thaiYear = () => new Date().getFullYear() + 543;

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReportsTaxGroupPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [stations, setStations] = useState<{ CODE: string; NAMESTATION: string | null }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
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
      if (!currentFilters.yearthai.trim()) {
        setData(null);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(targetSize),
      });
      if (currentFilters.yearthai.trim()) params.set('yearthai', currentFilters.yearthai.trim());
      if (currentFilters.station.trim()) params.set('station', currentFilters.station.trim());

      const res = await fetch(`/api/reports/taxtmonth?${params.toString()}`, {
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
      if (!currentFilters.yearthai && json.yearthai) {
        setFilters((prev) => ({ ...prev, yearthai: json.yearthai }));
      }
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
      <AppHeader activePath="/reports/taxtmonth" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <div className="d-flex flex-column gap-1">
              <h1 className="h5 mb-0">สรุปภาษี (กลุ่ม)</h1>
              <p className="small text-secondary mb-0">รวมรายรับรายเดือน แยกตามรายการจ่าย</p>
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="small text-secondary fw-semibold">
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'กำลังโหลด...'}
                </span>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <button
                    type="submit"
                    form="taxtmonth-filter-form"
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

          <form id="taxtmonth-filter-form" className="px-3 pt-3 pb-2 border-bottom bg-light" onSubmit={handleSearch}>
            <div className="row g-2 align-items-end">
              <label className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <span>ปีภาษี (พ.ศ.)</span>
                <input
                  type="text"
                  value={filters.yearthai}
                  onChange={onFilterChange('yearthai')}
                  className="form-control form-control-sm"
                  placeholder={String(thaiYear())}
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

          {data?.stationName && (
            <div className="text-center fs-5 fw-bold mt-2">{data.stationName || 'สถานที่ปฏิบัติงาน'}</div>
          )}

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>PAYNAME</th>
                  <th>ม.ค.</th>
                  <th>ก.พ.</th>
                  <th>มี.ค.</th>
                  <th>เม.ย.</th>
                  <th>พ.ค.</th>
                  <th>มิ.ย.</th>
                  <th>ก.ค.</th>
                  <th>ส.ค.</th>
                  <th>ก.ย.</th>
                  <th>ต.ค.</th>
                  <th>พ.ย.</th>
                  <th>ธ.ค.</th>
                  <th>รวม</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={14} className="text-center text-primary fw-semibold p-3">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}
                {data?.items.map((row) => (
                  <tr key={row.PAYNAME}>
                    <td>{row.PAYNAME}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m01)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m02)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m03)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m04)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m05)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m06)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m07)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m08)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m09)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m10)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m11)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.m12)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.allmonth)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={14} className="text-center text-secondary p-3">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
              {data && (
                <tfoot>
                  <tr>
                    <th>รวม</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m01 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m02 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m03 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m04 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m05 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m06 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m07 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m08 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m09 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m10 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m11 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.m12 ?? 0)}</th>
                    <th className="text-end text-nowrap">{formatMoney(data.totals?.allmonth ?? 0)}</th>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

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

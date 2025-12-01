'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';

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

  const pageWindow = useMemo(() => {
    if (!data) return [];
    const total = data.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 3, total - 6));
    const end = Math.min(total, start + 6);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [data, page]);

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
    <div className={styles.page}>
      <AppHeader activePath="/reports/taxdept" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <div className={styles.title}>
              <h1>สรุปภาษี (ฝ่าย)</h1>
              <p>รวมเงินได้และภาษี แยกตามหน่วยงาน</p>
            </div>
            <div className={styles.controls}>
              <div className={styles.displayActions}>
                <span className={styles.resultText}>
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'กำลังโหลด...'}
                </span>
                <div className={styles.actionButtons}>
                  <button
                    type="submit"
                    form="taxdept-filter-form"
                    className={styles.primaryBtn}
                    disabled={loading}
                  >
                    {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
                  </button>
                  <button type="button" className={styles.secondaryBtn} onClick={handleReset} disabled={loading}>
                    ล้างข้อมูล
                  </button>
                </div>
              </div>
            </div>
          </div>

          <form id="taxdept-filter-form" className={styles.filterForm} onSubmit={handleSearch}>
            <div className={styles.filtersRow}>
              <label className={styles.filterField}>
                <span>ปีภาษี (พ.ศ.)</span>
                <input
                  type="text"
                  value={filters.yearthai}
                  onChange={onFilterChange('yearthai')}
                  className={styles.filterInput}
                  placeholder="เช่น 2568"
                />
              </label>
              <label className={styles.filterField}>
                <span>สถานที่ปฏิบัติงาน</span>
                <select
                  value={filters.station}
                  onChange={onFilterChange('station')}
                  className={styles.filterSelect}
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

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
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
                    <td colSpan={7} className={styles.loading}>
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
                    <td className={styles.numberCell}>{formatMoney(row.SUMMONEY)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.TAX)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className={styles.empty}>
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <div className={styles.metaRow}>
              <div className={styles.totals}>
                <span>
                  Total รวมเงินได้: <strong>{formatMoney(data.totalIncome)}</strong>
                </span>
                <span>
                  Total ภาษี: <strong>{formatMoney(data.totalTax)}</strong>
                </span>
              </div>
              {data.totalPages > 1 && (
                <div className={styles.actionButtons}>
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => fetchData(Math.max(1, page - 1), pageSize)}
                    disabled={page === 1 || loading}
                  >
                    &lt; Prev
                  </button>
                  {pageWindow.map((p) => (
                    <button
                      key={p}
                      className={`${styles.secondaryBtn} ${p === page ? styles.primaryBtn : ''}`}
                      onClick={() => fetchData(p, pageSize)}
                      disabled={p === page || loading}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className={styles.secondaryBtn}
                    onClick={() => fetchData(Math.min(page + 1, data.totalPages), pageSize)}
                    disabled={page === data.totalPages || loading}
                  >
                    Next &gt;
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <div className={styles.linksRow}>
          <a
            className={styles.link}
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

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
  DEPART: string;
  NAMESTATION: string;
  YEARTHAI: string;
  x10001: number;
  x10002: number;
  x10004: number;
  x10005: number;
  x10010: number;
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

const thaiYear = () => new Date().getFullYear() + 543;

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ReportsTaxTitlePage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const departs = ['ข้าราชการ', 'พนักงานกระทรวง', 'พนักงานราชการ', 'ลูกจ้าง'];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    yearthai: '',
    depart: '',
  });

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
      if (currentFilters.depart.trim()) params.set('depart', currentFilters.depart.trim());

      const res = await fetch(`/api/reports/taxtitle?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      }
      setData(json);
      setPage(targetPage);
      setPageSize(targetSize);
      if (!currentFilters.yearthai && json.items?.length) {
        setFilters((prev) => ({ ...prev, yearthai: json.items[0].YEARTHAI || String(thaiYear()) }));
      }
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    const cleared = { yearthai: '', depart: '' };
    setFilters(cleared);
    setPage(1);
    void fetchData(1, pageSize, cleared);
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/reports/taxtitle" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <div className={styles.title}>
              <h1>สรุปภาษี (ตำแหน่ง)</h1>
              <p>รวมเงินได้และภาษี แยกตามตำแหน่ง</p>
            </div>
            <div className={styles.controls}>
              <div className={styles.displayActions}>
                <span className={styles.resultText}>
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'กำลังโหลด...'}
                </span>
                <div className={styles.actionButtons}>
                  <button
                    type="submit"
                    form="taxtitle-filter-form"
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

          <form id="taxtitle-filter-form" className={styles.filterForm} onSubmit={handleSearch}>
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
                <span>ตำแหน่ง</span>
                <select value={filters.depart} onChange={onFilterChange('depart')} className={styles.filterSelect}>
                  <option value="">ตำแหน่ง</option>
                  {departs.map((d) => (
                    <option key={d} value={d}>
                      {d}
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
                  <th>DEPART</th>
                  <th>NAMESTATION</th>
                  <th>YEARTHAI</th>
                  <th>เงินเดือน</th>
                  <th>งด.คบ.</th>
                  <th>เงินเพิ่ม</th>
                  <th>พ.ต.ส.</th>
                  <th>โบนัส</th>
                  <th>รวมเงินได้</th>
                  <th>รวมภาษี</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={13} className={styles.loading}>
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}
                {data?.items.map((row) => (
                  <tr key={row.ID}>
                    <td>{row.ID}</td>
                    <td>{row.CID}</td>
                    <td>{row.NAME}</td>
                    <td>{row.DEPART}</td>
                    <td>{row.NAMESTATION}</td>
                    <td>{row.YEARTHAI}</td>
                    <td className={styles.numberCell}>{formatMoney(row.x10001)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.x10002)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.x10004)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.x10005)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.x10010)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.SUMMONEY)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.TAX)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={13} className={styles.empty}>
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
      </main>

      <AppFooter />
    </div>
  );
}

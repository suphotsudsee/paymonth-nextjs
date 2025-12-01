'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';

type SummaryRow = {
  PNUMBER: string;
  NODEEGAR: string;
  MONEY: number;
  ACCNAME: string;
  CHEQUE: string;
  PAYDATE: string | null;
  MPAYALL: number;
  BALANCE: number;
  DUPDATE: string | null;
};

type ApiResult = {
  items: SummaryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalIncome: number;
  totalOutcome: number;
  totalBalance: number;
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const formatDateTime = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SummaryDeegarPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    pnumber: '',
    cheque: '',
    accname: '',
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
      if (currentFilters.pnumber.trim()) params.set('pnumber', currentFilters.pnumber.trim());
      if (currentFilters.cheque.trim()) params.set('cheque', currentFilters.cheque.trim());
      if (currentFilters.accname.trim()) params.set('accname', currentFilters.accname.trim());
      const res = await fetch(`/api/reports/summarydeegar?${params.toString()}`, {
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

  const handlePageChange = (nextPage: number) => {
    if (!data || nextPage === page) return;
    void fetchData(nextPage, pageSize);
  };

  const handlePageSizeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(e.target.value) || 10;
    void fetchData(1, nextSize);
  };

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
    const cleared = { pnumber: '', cheque: '', accname: '' };
    setFilters(cleared);
    setPage(1);
    void fetchData(1, pageSize, cleared);
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/reports/summarydeegar" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <div className={styles.title}>
              <h1>สรุปฎีกา</h1>
              <p>ยอดรับ-จ่ายตามเลขฎีกา (PNUMBER / NODEEGAR)</p>
            </div>
            <div className={styles.controls}>
              <div className={styles.displayActions}>
                <span className={styles.resultText}>
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'กำลังโหลด...'}
                </span>
                <div className={styles.actionButtons}>
                  <button
                    type="submit"
                    form="summarydeegar-filter-form"
                    className={styles.primaryBtn}
                    disabled={loading}
                  >
                    {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
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
          </div>

          <form id="summarydeegar-filter-form" className={styles.filterForm} onSubmit={handleSearch}>
            <div className={styles.filtersRow}>
              <label className={styles.filterField}>
                <span>เลขฎีกา (PNUMBER)</span>
                <input
                  value={filters.pnumber}
                  onChange={onFilterChange('pnumber')}
                  className={styles.filterInput}
                  placeholder="ค้นหาเลขฎีกา"
                />
              </label>
              <label className={styles.filterField}>
                <span>เลขเช็ค</span>
                <input
                  value={filters.cheque}
                  onChange={onFilterChange('cheque')}
                  className={styles.filterInput}
                  placeholder="ค้นหาเลขเช็ค"
                />
              </label>
              <label className={styles.filterField}>
                <span>ชื่อบัญชี (ACCNAME)</span>
                <input
                  value={filters.accname}
                  onChange={onFilterChange('accname')}
                  className={styles.filterInput}
                  placeholder="ค้นหาชื่อบัญชี"
                />
              </label>

            </div>
          </form>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>PNUMBER</th>
                  <th>NODEEGAR</th>
                  <th>DUPDATE</th>
                  <th>CHEQUE</th>
                  <th>PAYDATE</th>
                  <th>ACCNAME</th>
                  <th>รับมา</th>
                  <th>จ่ายไป</th>
                  <th>คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={9} className={styles.loading}>
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}
                {data?.items.map((row) => (
                  <tr key={`${row.PNUMBER}-${row.NODEEGAR}`}>
                    <td className={styles.linkCell}>
                      <a href={`/reports/summarydeegar/${row.PNUMBER}/${row.NODEEGAR}`}>
                        {row.PNUMBER || '-'}
                      </a>
                    </td>
                    <td>{row.NODEEGAR || '-'}</td>
                    <td>{formatDateTime(row.DUPDATE)}</td>
                    <td>{row.CHEQUE || '-'}</td>
                    <td>{formatDate(row.PAYDATE)}</td>
                    <td>{row.ACCNAME || '-'}</td>
                    <td className={styles.numberCell}>{formatMoney(row.MONEY)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.MPAYALL)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.BALANCE)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={9} className={styles.empty}>
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 0 && (
            <div className={styles.metaRow}>
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                  disabled={page === 1 || loading}
                >
                  &lt; Previous
                </button>
                {pageWindow.map((p) => (
                  <button
                    key={p}
                    className={`${styles.pageBtn} ${p === page ? styles.currentPage : ''}`}
                    onClick={() => handlePageChange(p)}
                    disabled={p === page || loading}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(Math.min(page + 1, data.totalPages))}
                  disabled={page === data.totalPages || loading}
                >
                  Next &gt;
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

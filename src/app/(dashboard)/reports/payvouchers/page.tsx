'use client';

import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';

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

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const [chequeOptions, setChequeOptions] = useState<string[]>([]);

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
    <div className={styles.page}>
      <AppHeader activePath="/reports/payvouchers" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <div className={styles.title}>
              <h1>ทะเบียนคุมใบสำคัญจ่ายฯ</h1>
              <p>ค้นหาใบสำคัญจ่ายตามช่วงวันที่และเงื่อนไข</p>
            </div>
            <div className={styles.controls}>
              <div className={styles.displayActions}>
                <span className={styles.resultText}>
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'ยังไม่ค้นหา'}
                </span>
                <div className={styles.actionButtons}>
                  <button
                    type="submit"
                    form="payvouchers-filter-form"
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

          <form id="payvouchers-filter-form" className={styles.filterForm} onSubmit={handleSearch}>
            <div className={styles.filtersRow}>
              <label className={styles.filterField}>
                <span>จากวันที่</span>
                <input
                  type="date"
                  value={filters.startdate}
                  onChange={onFilterChange('startdate')}
                  className={styles.filterInput}
                />
              </label>
              <label className={styles.filterField}>
                <span>ถึงวันที่</span>
                <input
                  type="date"
                  value={filters.enddate}
                  onChange={onFilterChange('enddate')}
                  className={styles.filterInput}
                />
              </label>
              <label className={styles.filterField}>
                <span>ค้นด้วย</span>
                <select value={filters.field} onChange={onFilterChange('field')} className={styles.filterSelect}>
                  <option value="pnumber">ที่ฏีกา</option>
                  <option value="cheque">CHEQUE</option>
                  <option value="payname">รายการจ่าย</option>
                  <option value="name">จ่ายให้</option>
                </select>
              </label>
              <label className={styles.filterField}>
                <span>คำค้น</span>
                <input
                  value={filters.query}
                  onChange={onFilterChange('query')}
                  className={styles.filterInput}
                  placeholder="พิมพ์คำค้น"
                  list={filters.field === 'cheque' ? 'chequeOptions' : undefined}
                  onFocus={(e) => {
                    if (filters.field === 'cheque') {
                      void loadChequeOptions(e.currentTarget.value);
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

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
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
                    <td colSpan={8} className={styles.loading}>
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
                    <td className={styles.numberCell}>{formatMoney(row.MONEY)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className={styles.empty}>
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data && (

            <div className={styles.totalsRow}>
              <span>
                รวมจำนวนเงิน <strong>{formatMoney(data.totalMoney ?? 0)}</strong>
              </span>
            </div>

          )}
          {data && (
            <div className={styles.displayActions} style={{ padding: '10px 16px' }}>
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

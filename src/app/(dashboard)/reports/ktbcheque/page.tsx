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

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ktbchequePage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    cheque: '',
  });
  const [chequeOptions, setChequeOptions] = useState<string[]>([]);
  const [chequeQuery, setChequeQuery] = useState('');

  const fetchData = async (
    targetPage: number,
    targetSize: number = pageSize,
    currentFilters: typeof filters = filters,
  ) => {
    setLoading(true);
    setError(null);
    try {
      if (!currentFilters.cheque.trim()) {
        setData(null);
        setLoading(false);
        return;
      }

      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(targetSize),
        cheque: currentFilters.cheque.trim(),
      });

      const res = await fetch(`/api/reports/ktbcheque?${params.toString()}`, {
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

  const onChequeFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, cheque: value }));
    setChequeQuery(value);
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
    const handle = setTimeout(() => {
      void loadChequeOptions(chequeQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [chequeQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchData(1, pageSize);
  };

  const handleReset = () => {
    const cleared = { cheque: '' };
    setFilters(cleared);
    setPage(1);
    setData(null);
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/reports/ktbcheque" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <div className={styles.title}>
              <h1>ส่งกรุงไทย (เช็ค)</h1>
              <p>ค้นหาด้วยเลขที่เช็ค</p>
            </div>
            <div className={styles.controls}>
              <div className={styles.displayActions}>
                <span className={styles.resultText}>
                  {data ? `Displaying ${displayRange} of ${data.total} results.` : 'ยังไม่ค้นหา'}
                </span>
                <div className={styles.actionButtons}>
                  <button
                    type="submit"
                    form="ktbcheque-filter-form"
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

          <form id="ktbcheque-filter-form" className={styles.filterForm} onSubmit={handleSearch}>
            <div className={styles.filtersRow}>
              <label className={styles.filterField}>
                <span>เลขที่เช็ค</span>
                <input
                  value={filters.cheque}
                  onChange={onChequeFilterChange}
                  onFocus={(e) => {
                    void loadChequeOptions(e.currentTarget.value);
                  }}
                  className={styles.filterInput}
                  list="chequeOptions"
                  placeholder=""
                />
              </label>
            </div>
          </form>
          <datalist id="chequeOptions">
            {chequeOptions.map((cheque) => (
              <option key={cheque} value={cheque} />
            ))}
          </datalist>

          {error && <div className={styles.resultText}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
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
                    <td colSpan={9} className={styles.loading}>
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                )}
                {data?.items.map((row, idx) => (
                  <tr key={`${row.ID}-${row.CHEQUE}-${idx}`}>
                    <td>{row.IDBANK}</td>
                    <td>{row.ACCNAME}</td>
                    <td>{row.NAME}</td>
                    <td className={styles.numberCell}>{formatMoney(row.MONEY)}</td>
                    <td>{row.CID}</td>
                    <td>{row.CHEQUE}</td>
                    <td>{`${row.PNUMBER || ''}${row.NODEEGAR ? '/' + row.NODEEGAR : ''}`}</td>
                    <td>{row.EMAIL}</td>
                    <td>{row.MOBILE}</td>
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

          {data && (
            <div className={styles.totalsRow}>
              <span>
                รวมจำนวนเงิน <strong>{formatMoney(data.totalMoney ?? 0)}</strong>
              </span>
            </div>
          )}
        </section>

        <a
          className={styles.exportLink}
          href={
            filters.cheque.trim()
              ? `/api/reports/ktbcheque/export?cheque=${encodeURIComponent(filters.cheque.trim())}`
              : '#'
          }
          onClick={(e) => {
            if (!filters.cheque.trim()) {
              e.preventDefault();
              alert('กรุณากรอกเลขที่เช็ค ก่อนส่งออก');
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

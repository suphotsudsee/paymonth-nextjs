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

export default function ktbdeegarPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    pnumber: '',
    nodeegar: '',
  });

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
    <div className={styles.page}>
      <AppHeader activePath="/reports/ktbdeegar" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <div className={styles.title}>
              <h1>ส่งกรุงไทย (ฎีกา)</h1>
              <p>ค้นหาด้วยเลขที่ฎีกาและ NODEEGAR</p>
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
                <span>เลขที่ฎีกา</span>
                <input
                  value={filters.pnumber}
                  onChange={onFilterChange('pnumber')}
                  className={styles.filterInput}
                  placeholder=""
                />
              </label>
              <label className={styles.filterField}>
                <span>NODEEGAR</span>
                <input
                  value={filters.nodeegar}
                  onChange={onFilterChange('nodeegar')}
                  className={styles.filterInput}
                  placeholder=""
                />
              </label>
            </div>
          </form>

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
                {data?.items.map((row) => (
                  <tr key={`${row.ID}-${row.PNUMBER}-${row.NODEEGAR}`}>
                    <td>{row.IDBANK}</td>
                    <td>{row.ACCNAME}</td>
                    <td>{row.NAME}</td>
                    <td className={styles.numberCell}>{formatMoney(row.MONEY)}</td>
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

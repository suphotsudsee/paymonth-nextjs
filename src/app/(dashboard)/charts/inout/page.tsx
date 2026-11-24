'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';

type ChartItem = {
  month: string;
  income: number;
  outcome: number;
};

type ApiResult = {
  yearthai: string;
  items: ChartItem[];
};

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export default function InOutChartPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [year, setYear] = useState('2557');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (targetYear: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetYear.trim()) params.set('yearthai', targetYear.trim());
      const res = await fetch(`/api/charts/inout?${params.toString()}`, { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxValue = useMemo(() => {
    if (!data?.items?.length) return 0;
    return Math.max(...data.items.map((i) => Math.max(i.income, i.outcome)));
  }, [data]);

  const scaleHeight = (value: number) => {
    if (maxValue <= 0) return 0;
    return Math.max(4, Math.round((value / maxValue) * 220));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchData(year);
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/charts/inout" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 p-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex flex-column gap-1">
              <h1 className="h5 mb-0">รายรับรายจ่าย</h1>
              <p className="small text-secondary mb-0">ข้อมูลปีภาษี: {data?.yearthai || year}</p>
            </div>
            <form className="d-flex flex-wrap align-items-center gap-2" onSubmit={handleSearch}>
              <input
                className="form-control w-auto"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2557"
              />
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? 'กำลังโหลด...' : 'ค้นหา'}
              </button>
            </form>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 mt-2 mb-0 small">{error}</div>}

          <div className="mt-3 pb-3">
            <div className={styles.bars}>
              {data?.items.map((item) => (
                <div key={item.month} className="d-flex flex-column align-items-center gap-1">
                  <div className={`${styles.bar} ${styles.incomeBar}`} style={{ height: scaleHeight(item.income) }}>
                    <span className={styles.barLabel} style={{ color: '#2c7be5' }}>
                      {formatMoney(item.income)}
                    </span>
                  </div>
                  <div className={`${styles.bar} ${styles.outcomeBar}`} style={{ height: scaleHeight(item.outcome) }}>
                    <span className={styles.barLabel} style={{ color: '#111' }}>
                      {formatMoney(item.outcome)}
                    </span>
                  </div>
                  <div className="small text-center">{item.month}</div>
                </div>
              ))}
              {!data?.items?.length && !loading && <div>ไม่มีข้อมูล</div>}
            </div>

            <div className="d-flex flex-wrap gap-3 align-items-center mt-3">
              <div className="d-flex gap-2 align-items-center small">
                <span className={styles.legendSwatch} style={{ background: '#2c7be5' }} />
                <span>รายรับ</span>
              </div>
              <div className="d-flex gap-2 align-items-center small">
                <span className={styles.legendSwatch} style={{ background: '#e600a8' }} />
                <span>รายจ่าย</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

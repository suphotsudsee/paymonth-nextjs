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
    <div className={styles.page}>
      <AppHeader activePath="/charts/inout" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.header}>
            <div className={styles.title}>
              <h1>รายรับรายจ่าย</h1>
              <p>ข้อมูลปีภาษี: {data?.yearthai || year}</p>
            </div>
            <form className={styles.controls} onSubmit={handleSearch}>
              <input
                className={styles.input}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2557"
              />
              <button className={styles.button} type="submit" disabled={loading}>
                {loading ? 'กำลังโหลด...' : 'ค้นหา'}
              </button>
            </form>
          </div>

          {error && <div className={styles.title}>{error}</div>}

          <div className={styles.chart}>
            <div className={styles.bars}>
              {data?.items.map((item) => (
                <div key={item.month} className={styles.barGroup}>
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
                  <div className={styles.month}>{item.month}</div>
                </div>
              ))}
              {!data?.items?.length && !loading && <div>ไม่มีข้อมูล</div>}
            </div>

            <div className={styles.legend}>
              <div className={styles.legendItem}>
                <span className={styles.legendSwatch} style={{ background: '#2c7be5' }} />
                <span>รายรับ</span>
              </div>
              <div className={styles.legendItem}>
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

'use client';

import { useSearchParams } from 'next/navigation';
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

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TaxDeptGroupPage() {
  const search = useSearchParams();
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearthai = search?.get('yearthai') || '';
  const station = search?.get('station') || '';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (yearthai) params.set('yearthai', yearthai);
      if (station) params.set('station', station);
      const res = await fetch(`/api/reports/taxdept?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      }
      setData(json);
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearthai, station]);

  const periodLabel = useMemo(() => {
    const yr = data?.items?.[0]?.YEARTHAI || yearthai;
    return yr ? `ม.ค.-ธ.ค.${yr}` : '';
  }, [data, yearthai]);

  return (
    <div className={styles.page}>
      <AppHeader activePath="/reports/taxdept" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <div>
              <h1 className={styles.title}>หนังสือรับรองภาษีรายกลุ่ม</h1>
              <p className={styles.subtitle}>
                ปีภาษี: {data?.items?.[0]?.YEARTHAI || yearthai || '-'} | สถานที่ปฏิบัติงาน: {station || '-'}
              </p>
            </div>
          </div>

          {error && <div className={styles.subtitle}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ลำดับที่</th>
                  <th>ชื่อ</th>
                  <th>cid</th>
                  <th>จำนวนบุตร</th>
                  <th>จำนวนเงินที่จ่าย</th>
                  <th>วดป ที่จ่าย</th>
                  <th>ประเภทเงินได้</th>
                  <th>จำนวนเงิน</th>
                  <th>รวมรายได้</th>
                  <th>หัก ภาษี</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={10}>กำลังโหลดข้อมูล...</td>
                  </tr>
                )}
                {data?.items.map((row) => (
                  <tr key={row.ID}>
                    <td>{row.ID}</td>
                    <td className={styles.rowName}>{row.NAME}</td>
                    <td>{row.CID}</td>
                    <td>--</td>
                    <td>--</td>
                    <td>{periodLabel}</td>
                    <td>เงินเดือนตกเบิก</td>
                    <td className={styles.numberCell}>{formatMoney(row.SUMMONEY)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.SUMMONEY)}</td>
                    <td className={styles.numberCell}>{formatMoney(row.TAX)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} className={styles.subtitle}>
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <div className={styles.footerRow}>
              <span>รวมรายได้: {formatMoney(data.totalIncome)}</span>
              <span>ภาษี: {formatMoney(data.totalTax)}</span>
            </div>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

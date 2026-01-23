'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';

type DetailRow = {
  ID: number;
  IDBANK: string;
  NAME: string;
  CID: string;
  MONEY: number;
  PNUMBER: string;
  NODEEGAR: string;
  NUM: string;
  PAYTYPE: string;
  IDPAY: string;
  CHEQUE: string;
  PAYDATE: string | null;
  ACCNUMBER: string;
};

type ApiResult = {
  items: DetailRow[];
  total: number;
  totalIncome: number;
  totalOutcome: number;
  totalBalance: number;
  chequeNumber: string;
  accountNumber: string;
};

const BANGKOK_TIMEZONE = "Asia/Bangkok";

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BANGKOK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
};

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SummaryDeegarDetailPage() {
  const params = useParams<{ pnumber: string; nodeegar: string }>();
  const router = useRouter();
  const pnumberDisplay = params?.pnumber ? decodeURIComponent(params.pnumber) : '-';
  const nodeegarDisplay = params?.nodeegar ? decodeURIComponent(params.nodeegar) : '-';
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!params?.pnumber || !params?.nodeegar) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/reports/summarydeegar/${params.pnumber}/${params.nodeegar}`,
        { cache: 'no-store', credentials: 'include' },
      );
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
  }, [params?.pnumber, params?.nodeegar]);

  const totals = useMemo(() => {
    if (!data) return { income: 0, outcome1: 0, outcome2: 0 };
    return data.items.reduce(
      (acc, r) => {
        const money = Number(r.MONEY ?? 0);
        if (r.PAYTYPE === '1') acc.income += money;
        else if (r.PAYTYPE === '2') acc.outcome1 += money;
        else acc.outcome2 += money;
        return acc;
      },
      { income: 0, outcome1: 0, outcome2: 0 },
    );
  }, [data]);

  return (
    <div className={styles.page}>
      <AppHeader activePath="/reports/summarydeegar" />

      <main className={styles.main}>
        <section className={styles.card}>
          <div className={styles.headRow}>
            <h1 className={styles.title}>หมายเลขบัญชีธนาคารที่ออกเช็ค : {data?.accountNumber || '-'}</h1>
            <p className={styles.subTitle}>
              เลขฎีกา: {pnumberDisplay} / ครั้งที่: {nodeegarDisplay} | เลขเช็ค: {data?.chequeNumber || '-'}
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>ID</th>
                  <th>PNUMBER</th>
                  <th>NODEEGAR</th>
                  <th>NUM</th>
                  <th>salary-CID</th>
                  <th>IDBANK</th>
                  <th>CHEQUE</th>
                  <th>PAYDATE</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>รายรับ</th>
                  <th>คืนเงิน<br/>บำรุงสสจ.</th>
                  <th>คืนเงิน<br/>ทดรอง<br/>ราชการ</th>
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

                {data?.items.map((row, idx) => {
                  const income = row.PAYTYPE === '1' ? row.MONEY : 0;
                  const outcome1 = row.PAYTYPE === '2' ? row.MONEY : 0;
                  const outcome2 = row.PAYTYPE !== '1' && row.PAYTYPE !== '2' ? row.MONEY : 0;
                  return (
                    <tr key={`${row.ID}-${idx}`}>
                      <td className={styles.centerCell}>{idx + 1}</td>
                      <td className={styles.centerCell}>{row.ID}</td>
                      <td className={styles.centerCell}>{row.PNUMBER}</td>
                      <td className={styles.centerCell}>{row.NODEEGAR}</td>
                      <td className={styles.centerCell}>{row.NUM}</td>
                      <td className={styles.centerCell}>{row.CID}</td>
                      <td className={styles.centerCell}>{row.IDBANK}</td>
                      <td className={styles.centerCell}>{row.CHEQUE}</td>
                      <td className={styles.centerCell}>{formatDate(row.PAYDATE)}</td>
                      <td>{row.NAME || '-'}</td>
                      <td className={styles.numberCell}>{formatMoney(income)}</td>
                      <td className={styles.numberCell}>{formatMoney(outcome1)}</td>
                      <td className={styles.numberCell}>{formatMoney(outcome2)}</td>
                    </tr>
                  );
                })}

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
                  Total รับมา: <strong>{formatMoney(totals.income)}</strong>
                </span>
                <span>
                  Total คืนเงินบำรุงสสจ.: <strong>{formatMoney(totals.outcome1)}</strong>
                </span>
                <span>
                  Total คืนเงินทดลองราชการ: <strong>{formatMoney(totals.outcome2)}</strong>
                </span>
              </div>
              <div className={styles.actions}>
                <Link href={`/reports/summarydeegar`} className={styles.linkBtn}>
                  กลับสรุปฎีกา
                </Link>

              </div>
            </div>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import styles from "../../page.module.css";

type OfficerInfo = {
  cid: string;
  name?: string | null;
  position?: string | null;
  station?: string | null;
};

type PaydirectItem = {
  id: string;
  A: string | null;
  B: string | null;
  NAMEMONTH_TH: string | null;
  TOTALINCOME: string | null;
  TOTALOUTCOME: string | null;
  BALANCE: string | null;
  PAYID: string | null;
};

type PaydirectResponse = {
  officer: OfficerInfo | null;
  items: PaydirectItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const formatMoney = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  const cleaned = typeof value === "string" ? value.replace(/,/g, "").trim() : value;
  const num = typeof cleaned === "number" ? cleaned : Number(cleaned);
  if (!Number.isFinite(num)) return String(value);
  const amountInBaht = num / 100;
  return amountInBaht.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function OfficerPaydirectPage() {
  const params = useParams<{ cid?: string }>();
  const router = useRouter();
  const cid = typeof params?.cid === "string" ? params.cid : "";

  const [data, setData] = useState<PaydirectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = async (targetPage = 1) => {
    if (!cid) {
      setError("Missing CID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: "10",
      });
      const res = await fetch(`/api/officers/${cid}/paydirect?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "โหลดข้อมูล paydirect ไม่สำเร็จ");
      }
      setData(json as PaydirectResponse);
    } catch (err: any) {
      setError(err?.message || "โหลดข้อมูล paydirect ไม่สำเร็จ");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  const displayRange = useMemo(() => {
    if (!data) return "0-0";
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return `${start}-${end}`;
  }, [data]);

  const pageWindow = useMemo(() => {
    if (!data) return [];
    const total = data.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(data.page - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [data]);

  return (
    <div className={styles.page}>
      <AppHeader activePath="/officers" />

      <main className={styles.main}>
        <div className={styles.titleArea}>
          <h1>ประวัติการจ่ายตรง</h1>
          <p>แสดงข้อมูลจ่ายตรงของเจ้าหน้าที่</p>
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <div>
              {data?.officer && (
                <div className={styles.paydirectHeader}>
                  <div className={styles.paydirectName}>{data.officer.name ?? data.officer.cid}</div>
                  <div className={styles.paydirectMetaRow}>
                    <span>{`CID: ${data.officer.cid}`}</span>
                    {data.officer.position && <span>{data.officer.position}</span>}
                  </div>
                  {data.officer.station && (
                    <div className={styles.paydirectMetaRow}>
                      <span>{data.officer.station}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                แสดง {displayRange} จาก {data?.total ?? 0} รายการ
              </span>
   
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.paydirectTableSection}>
            <div className={styles.tableTop}>
              <span className={styles.tableTitle}>ประวัติการจ่ายตรง</span>
              <span className={styles.results}>CID: {cid || "-"}</span>
            </div>
            <div className={styles.paydirectTableWrap}>
              <table className={styles.paydirectTable}>
                <thead>
                  <tr>
                    <th>เดือน</th>
                    <th>ปี</th>
                    <th>รายรับรวม</th>
                    <th>รายจ่ายรวม</th>
                    <th>คงเหลือ</th>
                    <th>สลิป</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className={styles.emptyState}>
                        กำลังโหลด...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    data?.items?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.NAMEMONTH_TH ?? "-"}</td>
                        <td>{item.A ?? "-"}</td>
                        <td>{formatMoney(item.TOTALINCOME)}</td>
                        <td>{formatMoney(item.TOTALOUTCOME)}</td>
                        <td>{formatMoney(item.BALANCE)}</td>
                        <td>
                          {item.PAYID ? (
                            <Link href={`/officers/paydirect/${item.PAYID}`} target="_blank">
                              ใบรับรองเงินเดือนนี้
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  {!loading && (!data || data.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className={styles.emptyState}>
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data && data.totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => loadPage(Math.max(1, (data?.page ?? 1) - 1))}
                  disabled={loading || (data?.page ?? 1) <= 1}
                >
                  ก่อนหน้า
                </button>
                {pageWindow.map((p) => (
                  <button
                    key={p}
                    className={`${styles.pageBtn} ${p === data.page ? styles.currentPage : ""}`}
                    onClick={() => loadPage(p)}
                    disabled={loading}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className={styles.pageBtn}
                  onClick={() => loadPage(Math.min(data?.totalPages ?? 1, (data?.page ?? 1) + 1))}
                  disabled={loading || (data?.page ?? 1) >= (data?.totalPages ?? 1)}
                >
                  ถัดไป
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

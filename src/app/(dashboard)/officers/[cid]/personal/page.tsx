'use client';

import { useParams } from "next/navigation";
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

type PersonalItem = {
  MONTHTHAI: string;
  YEARTHAI: string;
  NAMEMONTH_TH: string | null;
  INCOME: number;
  OUTCOME: number;
};

type PersonalResponse = {
  officer: OfficerInfo | null;
  items: PersonalItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const formatMoney = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function OfficerPersonalPage() {
  const params = useParams<{ cid?: string }>();
  const cid = typeof params?.cid === "string" ? params.cid : "";

  const [data, setData] = useState<PersonalResponse | null>(null);
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
      const query = new URLSearchParams({
        page: String(targetPage),
        pageSize: "10",
      });
      const res = await fetch(`/api/officers/${cid}/personal?${query.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "ไม่สามารถโหลดข้อมูลส่วนบุคคลได้");
      }
      setData(json as PersonalResponse);
    } catch (err: any) {
      setError(err?.message || "ไม่สามารถโหลดข้อมูลส่วนบุคคลได้");
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
          <h1>สรุปเงินเดือนส่วนบุคคล</h1>
          <p>รวมรายรับ รายจ่าย และคงเหลือรายเดือนของเจ้าหน้าที่</p>
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
                แสดงผล {displayRange} จาก {data?.total ?? 0} รายการ
              </span>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.paydirectTableSection}>
            <div className={styles.paydirectTableWrap}>
              <table className={styles.paydirectTable}>
                <thead>
                  <tr>
                    <th>เดือน</th>
                    <th>พ.ศ.</th>
                    <th>รายรับ</th>
                    <th>รายจ่าย</th>
                    <th>คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={5} className={styles.emptyState}>
                        กำลังโหลด...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    data?.items?.map((item) => {
                      const income = Number(item.INCOME || 0);
                      const outcome = Number(item.OUTCOME || 0);
                      const balance = income - outcome;
                      return (
                        <tr key={`${item.YEARTHAI}-${item.MONTHTHAI}`}>
                          <td>{item.NAMEMONTH_TH ?? "-"}</td>
                          <td>{item.YEARTHAI}</td>
                          <td>{formatMoney(income)}</td>
                          <td>{formatMoney(outcome)}</td>
                          <td>{formatMoney(balance)}</td>
                        </tr>
                      );
                    })}
                  {!loading && (!data || data.items.length === 0) && (
                    <tr>
                      <td colSpan={5} className={styles.emptyState}>
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
                  &lt; Previous
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
                  Next &gt;
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

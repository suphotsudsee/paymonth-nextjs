'use client';

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import styles from "../../../../page.module.css";

type SlipRow = {
  IDPAY: string;
  PAYNAME: string | null;
  PAYTYPE: string | null;
  MONEY: number;
};

type SlipResponse = {
  officer: {
    cid: string;
    name: string | null;
    position: string | null;
    station: string | null;
    monththai: string;
    yearthai: string;
    monthName: string | null;
  } | null;
  income: SlipRow[];
  outcome: SlipRow[];
  totalIncome: number;
  totalOutcome: number;
  balance: number;
};

const formatMoney = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PaypersonSlipPage() {
  const params = useParams<{ cid?: string; yearthai?: string; monththai?: string }>();
  const cid = typeof params?.cid === "string" ? params.cid : "";
  const monththai = typeof params?.monththai === "string" ? params.monththai : "";
  const yearthai = typeof params?.yearthai === "string" ? params.yearthai : "";

  const [data, setData] = useState<SlipResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!cid || !monththai || !yearthai) {
      setError("Missing CID/month/year");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/officers/${cid}/payperson/${yearthai}/${monththai}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "โหลดสลิปส่วนบุคคลไม่สำเร็จ");
      }
      setData(json as SlipResponse);
    } catch (err: any) {
      setError(err?.message || "โหลดสลิปส่วนบุคคลไม่สำเร็จ");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, monththai, yearthai]);

  const officer = data?.officer;

  return (
    <div className={styles.page}>
      <AppHeader activePath="/officers" />
      <main className={styles.main}>
        <div className={styles.paypersonSlip}>
          <div className={styles.paypersonSlipTitle}>สำนักงานสาธารณสุขจังหวัดอุบลราชธานี</div>

          {loading && <div className={styles.paypersonSlipLoading}>กำลังโหลด...</div>}
          {error && <div className={styles.error}>{error}</div>}

          {data && officer && (
            <>
              <div className={styles.paypersonSlipSubtitle}>
                สรุปผลรายละเอียดการรับจ่ายเงิน<br />
                ประจำเดือน {officer.monthName ?? officer.monththai} {officer.yearthai}
              </div>
              <div className={styles.paypersonSlipMeta}>
                ลำดับที่ {officer.cid} <br />
                {officer.name ?? officer.cid}<br />
                {officer.position ?? ""} {officer.station ?? ""}
              </div>

              <div className={styles.paypersonBox}>
                <div className={styles.paypersonBoxHeader}>รายรับ</div>
                <div className={styles.paypersonBoxBody}>
                  {data.income.length === 0 && <div className={styles.paypersonRow}>ไม่มีข้อมูลรายรับ</div>}
                  {data.income.map((row) => (
                    <div key={row.IDPAY} className={styles.paypersonRow}>
                      <span>{row.PAYNAME ?? row.IDPAY}</span>
                      <span>{formatMoney(row.MONEY)} บาท</span>
                    </div>
                  ))}
                  <div className={styles.paypersonRowTotal}>
                    <span>รวมรับ</span>
                    <span>{formatMoney(data.totalIncome)} บาท</span>
                  </div>
                </div>
              </div>

              <div className={styles.paypersonBox}>
                <div className={styles.paypersonBoxHeader}>รายจ่าย</div>
                <div className={styles.paypersonBoxBody}>
                  {data.outcome.length === 0 && <div className={styles.paypersonRow}>ไม่มีข้อมูลรายจ่าย</div>}
                  {data.outcome.map((row) => (
                    <div key={row.IDPAY} className={styles.paypersonRow}>
                      <span>{row.PAYNAME ?? row.IDPAY}</span>
                      <span>{formatMoney(row.MONEY)} บาท</span>
                    </div>
                  ))}
                  <div className={styles.paypersonRowTotal}>
                    <span>รวมจ่าย</span>
                    <span>{formatMoney(data.totalOutcome)} บาท</span>
                  </div>
                  <div className={styles.paypersonRowBalance}>
                    <span>คงเหลือ</span>
                    <span>{formatMoney(data.balance)} บาท</span>
                  </div>
                </div>
              </div>

              <div className={styles.paypersonNote}>
                (แปลงคงเหลือสามพันบาทคำวน)
              </div>
            </>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

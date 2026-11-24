'use client';

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

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
    bankAccount: string | null;
    bankName: string | null;
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
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/officers" />
      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <div className="card shadow-sm p-3 mx-auto col-12 col-md-10 col-lg-7 col-xl-6">
          <div className="fs-5 fw-bold mb-3">สำนักงานสาธารณสุขจังหวัดอุบลราชธานี</div>

          {loading && <div className="p-3">กำลังโหลด...</div>}
          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          {data && officer && (
            <>
              <div className="fw-semibold mb-2">
                สรุปผลรายละเอียดการรับจ่ายเงิน<br />
                ประจำเดือน {officer.monthName ?? officer.monththai} {officer.yearthai}
              </div>
              <div className="mb-3">
                ลำดับที่ {officer.cid} <br />
                {officer.name ?? officer.cid}<br />
                {officer.position ?? ""} {officer.station ?? ""}
              </div>

              <div className="card border-success mb-3 overflow-hidden">
                <div className="card-header text-bg-success fw-bold">รายรับ</div>
                <div className="list-group list-group-flush">
                  {data.income.length === 0 && <div className="list-group-item d-flex justify-content-between gap-2">ไม่มีข้อมูลรายรับ</div>}
                  {data.income.map((row, idx) => (
                    <div key={`${row.IDPAY}-${idx}`} className="list-group-item d-flex justify-content-between gap-2">
                      <span>{row.PAYNAME ?? row.IDPAY}</span>
                      <span>{formatMoney(row.MONEY)} บาท</span>
                    </div>
                  ))}
                  <div className="list-group-item list-group-item-success d-flex justify-content-between gap-2 fw-bold">
                    <span>รวมรับ</span>
                    <span>{formatMoney(data.totalIncome)} บาท</span>
                  </div>
                </div>
              </div>

              <div className="card border-success mb-3 overflow-hidden">
                <div className="card-header text-bg-success fw-bold">รายจ่าย</div>
                <div className="list-group list-group-flush">
                  {data.outcome.length === 0 && <div className="list-group-item d-flex justify-content-between gap-2">ไม่มีข้อมูลรายจ่าย</div>}
                  {data.outcome.map((row, idx) => (
                    <div key={`${row.IDPAY}-${idx}`} className="list-group-item d-flex justify-content-between gap-2">
                      <span>{row.PAYNAME ?? row.IDPAY}</span>
                      <span>{formatMoney(row.MONEY)} บาท</span>
                    </div>
                  ))}
                  <div className="list-group-item list-group-item-success d-flex justify-content-between gap-2 fw-bold">
                    <span>รวมจ่าย</span>
                    <span>{formatMoney(data.totalOutcome)} บาท</span>
                  </div>
                  <div className="list-group-item list-group-item-info d-flex justify-content-between gap-2 fw-bold">
                    <span>คงเหลือ</span>
                    <span>{formatMoney(data.balance)} บาท</span>
                  </div>
                </div>
              </div>

              <div className="fs-6 fw-bold text-secondary p-2 border-top">
                 โอนเข้าบัญชี {officer.bankName ?? "-"} เลขที่บัญชี {officer.bankAccount ?? "-"}
              </div>
            </>
          )}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

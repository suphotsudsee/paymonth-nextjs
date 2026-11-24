import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { buildPaydirectAccessClause } from "@/lib/paydirectAccess";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const BANGKOK_TIMEZONE = "Asia/Bangkok";

type PaydirectDetail = {
  ID: bigint | number;
  A: string | null; // ปี (พ.ศ.)
  B: string | null; // เดือน
  C: string | null; // CID
  D: string | null;
  E: string | null;
  F: string | null;
  G: string | null;
  H: string | null;
  I: string | null;
  J: string | null;
  K: string | null;
  L: string | null;
  M: string | null;
  NAME: string | null;
  LPOS: string | null;
  NAMESTATION: string | null;
  DEPART: string | null;
  NAMEMONTH_TH: string | null;
  TOTALINCOME: string | null;
  TOTALOUTCOME: string | null;
  BALANCE: string | null;
  SALARY: string | null;
  O: string | null;
  SALPOS: string | null;
  NOCLINIC: string | null;
  S: string | null;
  AC: string | null;
  AB: string | null;
  AI: string | null;
  RETIRE: string | null;
  SUBJECT: string | null;
  Q: string | null;
  Y: string | null;
  AA: string | null;
  TAX: string | null;
  ASS: string | null;
  COOP: string | null;
  AU: string | null;
  RETIRE2: string | null;
  GHBANK: string | null;
  AY: string | null;
  AZ: string | null;
  BA: string | null;
  BB: string | null;
  BE: string | null;
  INSURE: string | null;
  OTH: string | null;
  OTH1: string | null;
};

const toBaht = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num)) return 0;
  return num / 100; // data stored in satang
};

const formatBaht = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function PaydirectSlipPage({ params }: { params: Promise<{ payid: string }> | { payid: string } }) {
  const resolved = params instanceof Promise ? await params : params;
  const idNum = Number(resolved.payid);
  if (!Number.isFinite(idNum)) return notFound();

  const session = await getAppSession();
  if (!session) return notFound();

  const access = buildPaydirectAccessClause(session, { paydirect: "paydirect", officer: "officer" });

  const rows = (await prisma.$queryRawUnsafe(
    `
      SELECT
        paydirect.*,
        officer.NAME,
        officer.LPOS,
        station.NAMESTATION,
        station.DEPART,
        cmonth.NAMEMONTH_TH
      FROM paydirect
      LEFT JOIN officer ON officer.CID = paydirect.C
      LEFT JOIN station ON officer.CODE = station.CODE
      LEFT JOIN cmonth ON paydirect.B = cmonth.ID
      WHERE paydirect.ID = ?
        AND ${access.clause}
      LIMIT 1
    `,
    idNum,
    ...access.params,
  )) as PaydirectDetail[];

  const detail = rows[0];
  if (!detail) return notFound();

  const incomeRows = [
    { label: "เงินเดือน", amount: toBaht(detail.SALARY) },
    { label: "เงินเดือน(ตกเบิก)", amount: toBaht(detail.O) },
    { label: "เงินปจต. /วิชาชีพ /วิทยฐานะ", amount: toBaht(detail.SALPOS) },
    { label: "เงินปจต. /วิชาชีพ /วิทยฐานะ(ตกเบิก)", amount: toBaht(detail.Q) },
    { label: "ต.ข.ท.ปจต./ต.ข.8-8ว./ต.ด.ข.1-7", amount: toBaht(detail.NOCLINIC) + toBaht(detail.SUBJECT) + toBaht(detail.AB) },
    { label: "ต.ข.ท.ปจต./ต.ข.8-8ว./ต.ด.ข.1-7(ตกเบิก)", amount: toBaht(detail.Y) + toBaht(detail.AA) },
    { label: "เงินช่วยเหลือบุตร", amount: 0 },
    { label: "เงิน พ.ส.ร/พ.ต.ก.", amount: toBaht(detail.S) },
    { label: "เงินตอบแทนพิเศษ", amount: 0},
    { label: "อื่นๆ", amount: toBaht(detail.AC) + toBaht(detail.AI) },
  ];

  const outcomeRows = [
    { label: "ภาษี", amount: toBaht(detail.TAX) },
    { label: "ค่าทุนเรือนหุ้น-เงินกู้สหกรณ์", amount: toBaht(detail.COOP) },
    { label: "กบข./กสจ.(รายเดือน)", amount: toBaht(detail.RETIRE) + toBaht(detail.RETIRE2) },
    { label: "เงินกู้เพื่อที่อยู่อาศัย", amount: toBaht(detail.GHBANK) },
    { label: "เงินกู้เพื่อการศึกษา", amount: toBaht(detail.AY) },
    { label: "เงินกู้ยานพาหนะ", amount: toBaht(detail.AZ) },
    { label: "ค่าฌาปนกิจ/เงินช่วยเหลืองานศพ", amount: toBaht(detail.INSURE) },
    { label: "เงินบำรุง/เงินทุน/กู้สวัสดีการ/สงเคราะห์", amount: toBaht(detail.AU) },
    { label: "เงินบำรุงเริยกคืน/ชดใช้ทางแพ่ง/อายัดเงิน", amount: toBaht(detail.ASS) },
    { label: "อื่นๆ", amount: toBaht(detail.OTH) + toBaht(detail.OTH1) },
  ];

  const totalIncome =
    detail.TOTALINCOME !== null && detail.TOTALINCOME !== undefined
      ? toBaht(detail.TOTALINCOME)
      : incomeRows.reduce((sum, item) => sum + item.amount, 0);

  const totalOutcome =
    detail.TOTALOUTCOME !== null && detail.TOTALOUTCOME !== undefined
      ? toBaht(detail.TOTALOUTCOME)
      : outcomeRows.reduce((sum, item) => sum + item.amount, 0);

  const netBalance =
    detail.BALANCE !== null && detail.BALANCE !== undefined
      ? toBaht(detail.BALANCE)
      : totalIncome - totalOutcome;

  const today = new Date().toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: BANGKOK_TIMEZONE,
  });

  const monthLabel = detail.NAMEMONTH_TH ?? "-";
  const yearLabel = detail.A ?? "-";
  const fullName = detail.NAME || [detail.D, detail.E, detail.F].filter(Boolean).join(" ").trim() || "-";
  const namebank = detail.J ?? "-";
  const numberbank = detail.M ?? "-";
  const province = "อุบลราชธานี"; // Placeholder for province, as data source is unclear

  return (
    <div className={styles.page}>
      <div className={styles.a4}>
      <div className={styles.slip}>
        <header className="text-center fw-bold mb-3">
          <div>ใบรับรองการจ่ายเงินเดือนและเงินอื่น</div>
          <div>
            ประจำเดือน {monthLabel} ปี พ.ศ. {yearLabel}
          </div>
        </header>

        <section className="mb-3">
          <div className="row g-2 align-items-center mb-1">
            <span className="col-4">ชื่อ-นามสกุล</span>
            <span className="col border-bottom py-1">{fullName}</span>
          </div>
          <div className="row g-2 align-items-center mb-1">
            <span className="col-4">หน่วยงาน</span>
            <span className="col border-bottom py-1">{detail.NAMESTATION ?? detail.DEPART ?? "-"}</span>
          </div>
          <div className="row g-2 align-items-center mb-1">
            <span className="col-4">จังหวัด</span>
            <span className="col border-bottom py-1">{province}</span>
          </div>
          <div className="row g-2 align-items-center mb-1">
            <span className="col-4">โอนเงินเข้า</span>
            <span className="col border-bottom py-1">{namebank}</span>
          </div>
          <div className="row g-2 align-items-center mb-1">
            <span className="col-4">เลขที่บัญชี</span>
            <span className="col border-bottom py-1">{numberbank}</span>
          </div>
        </section>

        <section className="my-3">
          <table className="table table-bordered table-sm align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th>ลำดับ</th>
                <th>รายการ</th>
                <th>จำนวนเงิน(บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="table-light fw-semibold text-start">
                  รายรับ
                </td>
              </tr>
              {incomeRows.map((row, idx) => (
                <tr key={row.label}>
                  <td>{idx + 1}.</td>
                  <td>{row.label}</td>
                  <td className="text-end text-nowrap">{formatBaht(row.amount)}</td>
                </tr>
              ))}
              <tr className="fw-bold table-light">
                <td colSpan={2}>รวม</td>
                <td className="text-end text-nowrap">{formatBaht(totalIncome)}</td>
              </tr>

              <tr>
                <td colSpan={3} className="table-light fw-semibold text-start">
                  รายจ่าย
                </td>
              </tr>
              {outcomeRows.map((row, idx) => (
                <tr key={row.label}>
                  <td>{idx + 1}.</td>
                  <td>{row.label}</td>
                  <td className="text-end text-nowrap">{formatBaht(row.amount)}</td>
                </tr>
              ))}
              <tr className="fw-bold table-light">
                <td colSpan={2}>รวม</td>
                <td className="text-end text-nowrap">{formatBaht(totalOutcome)}</td>
              </tr>

              <tr className="fw-bolder table-primary">
                <td colSpan={2} className="text-center">
                  เงินสุทธิ
                </td>
                <td className="text-end text-nowrap">{formatBaht(netBalance)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="text-center mt-3 small">
          <div>ลงชื่อ.............................................. ผู้ทำหน้าที่จ่ายเงิน</div>
          <div>{today}</div>
          <div>วัน เดือน ปี ที่ออกหนังสือรับรอง</div>
        </section>
      </div>
      </div>
    </div>
  );
}

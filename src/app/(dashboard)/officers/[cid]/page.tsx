import Link from "next/link";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import styles from "../page.module.css";

type PageProps = {
  params?: {
    cid?: string;
  };
};

export default function OfficerSlipChooser({ params }: PageProps) {
  const cid = params?.cid ?? "";
  const hasCid = Boolean(cid);

  return (
    <div className={styles.page}>
      <AppHeader activePath="/officers" />

      <main className={styles.main}>
        <section className={styles.choiceCard}>
          <div className={styles.choiceHeader}>
            <h1 className={styles.choiceTitle}>เลือกประเภทสลิป</h1>
            <p className={styles.choiceSubtitle}>
              เลือกสลิปที่ต้องการดาวน์โหลด
            </p>
          </div>

          <div className={styles.choiceGrid}>
            <Link
              href={hasCid ? `/officers/${cid}/payperson` : "#"}
              className={`${styles.choiceButton} ${!hasCid ? styles.choiceButtonDisabled : ""}`}
              aria-disabled={!hasCid}
            >
              สลิปเงินโอน
            </Link>
            <Link
              href={hasCid ? `/officers/${cid}/paydirect` : "#"}
              className={`${styles.choiceButton} ${!hasCid ? styles.choiceButtonDisabled : ""}`}
              aria-disabled={!hasCid}
            >
              สลิปเงินเดือน
            </Link>
          </div>

          {!hasCid && (
            <p className={styles.choiceError}>ไม่พบรหัสผู้ใช้สำหรับสร้างลิงก์</p>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

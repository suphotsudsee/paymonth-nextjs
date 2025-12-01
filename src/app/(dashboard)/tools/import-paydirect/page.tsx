'use client';

import { useState } from "react";
import styles from "../../officers/page.module.css";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";

type ImportResult = {
  file: { name: string; type: string; sizeKB: number };
  inserted: number;
  skipped: number;
  totalLines: number;
  message: string;
};

export default function ImportPaydirectPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("กรุณาเลือกไฟล์สำหรับนำเข้า");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/paydirect/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถนำเข้าข้อมูลได้");
      } else {
        setResult(json as ImportResult);
      }
    } catch (_err) {
      setError("ไม่สามารถนำเข้าข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/tools/import-paydirect" />
      <main className={styles.main}>
        <div className={styles.titleArea}>
          <h1>นำเข้าข้อมูลเงินเดือน (paydirect)</h1>
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>อัปโหลดไฟล์</span>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                {result ? result.message : "เลือกไฟล์ข้อมูลเพื่อนำเข้า"}
              </span>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={onSubmit} style={{ padding: "14px 16px", display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>ที่อยู่ไฟล์</span>
              <input
                className={styles.input}
                type="file"
                name="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className={styles.saveRow}>
              <button className={styles.primaryBtn} type="submit" disabled={loading}>
                {loading ? "กำลังนำเข้า..." : "นำเข้าข้อมูล"}
              </button>
              <button
                className={styles.secondaryBtn}
                type="button"
                disabled={loading}
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  setError(null);
                  const input = document.querySelector<HTMLInputElement>('input[type=\"file\"]');
                  if (input) input.value = "";
                }}
              >
                ล้างค่า
              </button>
            </div>
          </form>

          {result && (
            <div style={{ padding: "0 16px 16px" }}>
              <div className={styles.detailRow}>
                <span>ไฟล์</span>
                <strong>
                  {result.file.name} ({result.file.sizeKB} kB) {result.file.type && `- ${result.file.type}`}
                </strong>
              </div>
              <div className={styles.detailRow}>
                <span>จำนวนบรรทัดทั้งหมด</span>
                <strong>{result.totalLines}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>บันทึกใหม่</span>
                <strong>{result.inserted}</strong>
              </div>
              <div className={styles.detailRow}>
                <span>ข้าม/ซ้ำ</span>
                <strong>{result.skipped}</strong>
              </div>
            </div>
          )}
        </section>
      </main>
      <AppFooter />
    </div>
  );
}

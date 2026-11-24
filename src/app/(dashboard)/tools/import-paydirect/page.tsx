'use client';

import { useState } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";

type ImportResult = {
  file: { name: string; type: string; sizeKB: number };
  inserted: number;
  skipped: number;
  totalLines: number;
  skippedRows?: Array<{ line: number; A: string; B: string; C: string }>;
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
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/tools/import-paydirect" />
      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <div className="mb-3">
          <h1 className="h4 mb-0">นำเข้าข้อมูลเงินเดือน (paydirect)</h1>
        </div>

        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>อัปโหลดไฟล์</span>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                {result ? result.message : "เลือกไฟล์ข้อมูลเพื่อนำเข้า"}
              </span>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <form onSubmit={onSubmit} className="card-body vstack gap-2">
            <label className="vstack gap-1">
              <span className="form-label mb-0">ที่อยู่ไฟล์</span>
              <input
                className="form-control"
                type="file"
                name="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "กำลังนำเข้า..." : "นำเข้าข้อมูล"}
              </button>
              <button
                className="btn btn-outline-secondary"
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
            <div className="px-3 pb-3">
              <div className="row mx-0 py-2 border-bottom small">
                <span className="col-5 col-sm-4 text-secondary">ไฟล์</span>
                <strong className="col">
                  {result.file.name} ({result.file.sizeKB} kB) {result.file.type && `- ${result.file.type}`}
                </strong>
              </div>
              <div className="row mx-0 py-2 border-bottom small">
                <span className="col-5 col-sm-4 text-secondary">จำนวนบรรทัดทั้งหมด</span>
                <strong className="col">{result.totalLines}</strong>
              </div>
              <div className="row mx-0 py-2 border-bottom small">
                <span className="col-5 col-sm-4 text-secondary">บันทึกใหม่</span>
                <strong className="col">{result.inserted}</strong>
              </div>
              <div className="row mx-0 py-2 border-bottom small">
                <span className="col-5 col-sm-4 text-secondary">ข้าม/ซ้ำ</span>
                <strong className="col">{result.skipped}</strong>
              </div>
              {result.skippedRows && result.skippedRows.length > 0 && (
                <details className="mt-3">
                  <summary className="fw-semibold">
                    Show skipped rows ({result.skippedRows.length})
                  </summary>
                  <div
                    className="mt-2 overflow-auto border rounded p-2 bg-light small font-monospace"
                    // 280px = ความสูงเดิมของกล่องรายการที่ข้าม; pre = คงบรรทัดแบบ CSV
                    style={{ maxHeight: 280, whiteSpace: "pre" }}
                  >
                    {["line,A,B,C", ...result.skippedRows.map((row) => `${row.line},${row.A},${row.B},${row.C}`)].join("\n")}
                  </div>
                </details>
              )}
            </div>
          )}
        </section>
      </main>
      <AppFooter />
    </div>
  );
}

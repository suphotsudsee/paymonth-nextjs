'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

type ChequeRow = {
  CHEQUE: string;
  CHEQUENAME: string;
  ACCNUMBER: string;
  PAYDATE: string | null;
  DUPDATE: string;
};

type ChequeDetail = {
  ID: number;
  CHEQUE: string;
  CHEQUENAME: string;
  ACCNUMBER: string;
  PAYDATE: string | null;
};

type ApiResult = {
  items: ChequeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const CHEQUE_MAX_LENGTH = 11;

export default function ChequePage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editCheque, setEditCheque] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    cheque: "",
    chequename: "",
    accnumber: "",
    paydate: "",
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ChequeDetail | null>(null);
  const [filters, setFilters] = useState({
    cheque: "",
    chequename: "",
    accnumber: "",
    paydate: "",
  });
  const [chequeOptions, setChequeOptions] = useState<string[]>([]);
  const [chequeQuery, setChequeQuery] = useState("");

  const pageSize = 10;

  const fetchData = async (
    targetPage: number,
    currentFilters: typeof filters = filters,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });

      if (currentFilters.cheque.trim()) params.set("cheque", currentFilters.cheque.trim());
      if (currentFilters.chequename.trim()) params.set("chequename", currentFilters.chequename.trim());
      if (currentFilters.accnumber.trim()) params.set("accnumber", currentFilters.accnumber.trim());
      if (currentFilters.paydate.trim()) params.set("paydate", currentFilters.paydate.trim());

      const res = await fetch(`/api/cheques?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดข้อมูลได้");
        setData(null);
      } else {
        setData(json);
        setPage(targetPage);
      }
    } catch (err) {
      setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void fetchData(1, filters);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const displayRange = useMemo(() => {
    if (!data) return "0-0";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, data.total);
    return `${start}-${end}`;
  }, [data, page]);

  const pageWindow = useMemo(() => {
    if (!data) return [];
    const total = data.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [data, page]);

  const onFilterChange =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const onChequeFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, cheque: value }));
    setChequeQuery(value);
  };

  const onCreateChange =
    (field: keyof typeof createForm) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));

  const onChequeCreateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCreateForm((prev) => ({ ...prev, cheque: value }));
    setChequeQuery(value);
  };

  const loadChequeOptions = async (query: string) => {
    try {
      const trimmed = query.trim();
      const params = new URLSearchParams({
        page: "1",
        pageSize: "10",
        recent: "1",
      });
      if (trimmed.length >= 2) {
        params.set("cheque", trimmed);
      }
      const res = await fetch(`/api/cheques?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.items)) {
        setChequeOptions([]);
        return;
      }
      const items = (json.items as { CHEQUE?: string }[])
        .map((item) => String(item.CHEQUE || "").trim())
        .filter(Boolean);
      setChequeOptions(Array.from(new Set(items)));
    } catch {
      setChequeOptions([]);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadChequeOptions(chequeQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [chequeQuery]);

  const openCreate = () => {
    setCreateForm({ cheque: "", chequename: "", accnumber: "", paydate: "" });
    setFormError(null);
    setModalMode("create");
    setEditCheque(null);
  };

  const openEdit = async (chequeId: string) => {
    setModalMode("edit");
    setEditCheque(chequeId);
    setFormError(null);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/cheques/${chequeId}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "ไม่สามารถโหลดข้อมูลทะเบียนเช็คได้");
      } else {
        const item = json.item as ChequeDetail;
        setCreateForm({
          cheque: item.CHEQUE ?? "",
          chequename: item.CHEQUENAME ?? "",
          accnumber: item.ACCNUMBER ?? "",
          paydate: item.PAYDATE ?? "",
        });
      }
    } catch (err) {
      setFormError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setModalLoading(false);
    }
  };

  const submitForm = async () => {
    if (!modalMode) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const payload = {
        cheque: createForm.cheque.trim(),
        chequename: createForm.chequename.trim(),
        accnumber: createForm.accnumber.trim(),
        paydate: createForm.paydate.trim() || null,
      };

      if (!payload.cheque || !payload.chequename || !payload.accnumber) {
        setFormError("กรอกข้อมูลที่จำเป็นให้ครบ");
        setFormSaving(false);
        return;
      }

      const isEdit = modalMode === "edit";
      const res = await fetch(isEdit ? `/api/cheques/${editCheque || payload.cheque}` : "/api/cheques", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json.error || "บันทึกทะเบียนเช็คไม่สำเร็จ");
      } else {
        setModalMode(null);
        setCreateForm({ cheque: "", chequename: "", accnumber: "", paydate: "" });
        await fetchData(1, filters);
      }
    } catch (err) {
      setFormError("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setFormSaving(false);
    }
  };

  const openDetail = async (chequeId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/cheques/${chequeId}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setDetailError(json.error || "ไม่สามารถโหลดข้อมูลทะเบียนเช็คได้");
      } else {
        setDetail(json.item);
      }
    } catch (err) {
      setDetailError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/cheques" />

      <main className={styles.main}>
        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>ทะเบียนเช็ค</span>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                แสดง {displayRange} จากทั้งหมด {data?.total ?? 0} รายการ
              </span>
              <button type="button" className={styles.createBtn} onClick={openCreate}>
                + เพิ่มทะเบียนเช็ค
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>เลขที่เช็ค</th>
                  <th>ชื่อเช็ค</th>
                  <th>เลขบัญชี</th>
                  <th>วันที่จ่าย</th>
                  <th>อัปเดตล่าสุด</th>
                  <th>เครื่องมือ</th>
                </tr>
                <tr className={styles.filterRow}>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหา เลขที่เช็ค"
                      maxLength={CHEQUE_MAX_LENGTH}
                      list="chequeOptions"
                      value={filters.cheque}
                      onChange={onChequeFilterChange}
                      onFocus={(e) => {
                        void loadChequeOptions(e.currentTarget.value);
                      }}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหา ชื่อเช็ค"
                      value={filters.chequename}
                      onChange={onFilterChange("chequename")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหา เลขบัญชี"
                      value={filters.accnumber}
                      onChange={onFilterChange("accnumber")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      type="date"
                      value={filters.paydate}
                      onChange={onFilterChange("paydate")}
                    />
                  </th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row, idx) => (
                  <tr key={`${row.CHEQUE}-${idx}`}>
                    <td>{row.CHEQUE}</td>
                    <td>{row.CHEQUENAME}</td>
                    <td>{row.ACCNUMBER}</td>
                    <td className={styles.numberCell}>{formatDate(row.PAYDATE)}</td>
                    <td className={styles.numberCell}>{formatDate(row.DUPDATE)}</td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.iconBtn}
                        title="ดูรายละเอียด"
                        type="button"
                        onClick={() => openDetail(row.CHEQUE)}
                      >
                        🔍
                      </button>
                      <button
                        className={styles.iconBtn}
                        title="แก้ไข"
                        type="button"
                        onClick={() => openEdit(row.CHEQUE)}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={6} className={styles.emptyState}>
                      {loading ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
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
                onClick={() => fetchData(Math.max(page - 1, 1))}
                disabled={page === 1 || loading}
              >
                &lt; ก่อนหน้า
              </button>
              {pageWindow.map((p) => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === page ? styles.currentPage : ""}`}
                  onClick={() => fetchData(p)}
                  disabled={p === page || loading}
                >
                  {p}
                </button>
              ))}
              <button
                className={styles.pageBtn}
                onClick={() => fetchData(Math.min(page + 1, data.totalPages))}
                disabled={page === data.totalPages || loading}
              >
                ถัดไป &gt;
              </button>
            </div>
          )}
        </section>
      </main>

      {modalMode && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>
                {modalMode === "edit" ? `Update Cheque ${createForm.cheque || editCheque || ""}` : "Create Cheque"}
              </h2>
              <button className={styles.modalClose} onClick={() => setModalMode(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalHint}>
                Fields with * are required. {modalLoading ? "กำลังโหลด..." : ""}
              </p>
              <div className={styles.formGrid}>
                <label>
                  Cheque *
                  <input
                    className={styles.input}
                    maxLength={CHEQUE_MAX_LENGTH}
                    list="chequeOptions"
                    value={createForm.cheque}
                    onChange={onChequeCreateChange}
                    onFocus={(e) => {
                      void loadChequeOptions(e.currentTarget.value);
                    }}
                  />
                </label>
                <label>
                  Chequename *
                  <input className={styles.input} value={createForm.chequename} onChange={onCreateChange("chequename")} />
                </label>
                <label>
                  Accnumber *
                  <input className={styles.input} value={createForm.accnumber} onChange={onCreateChange("accnumber")} />
                </label>
                <label>
                  Paydate
                  <input
                    className={styles.input}
                    type="date"
                    value={createForm.paydate}
                    onChange={onCreateChange("paydate")}
                  />
                </label>
              </div>
              {formError && <div className={styles.error}>{formError}</div>}
              <div className={styles.saveRow}>
                <button className={styles.primaryBtn} onClick={submitForm} disabled={formSaving || modalLoading}>
                  {formSaving ? "Saving..." : "Save"}
                </button>
                <button className={styles.secondaryBtn} type="button" onClick={() => setModalMode(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{detail?.CHEQUE ? `View Cheque ${detail.CHEQUE}` : "View Cheque"}</h2>
              <button className={styles.modalClose} onClick={() => setDetailOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              {detailLoading && <p className={styles.modalHint}>กำลังโหลด...</p>}
              {detailError && <div className={styles.error}>{detailError}</div>}
              {detail && (
                <table className={styles.detailTable}>
                  <tbody>
                    <tr>
                      <th>ID</th>
                      <td>{detail.ID}</td>
                    </tr>
                    <tr>
                      <th>Cheque</th>
                      <td>{detail.CHEQUE}</td>
                    </tr>
                    <tr>
                      <th>Chequename</th>
                      <td>{detail.CHEQUENAME}</td>
                    </tr>
                    <tr>
                      <th>Accnumber</th>
                      <td>{detail.ACCNUMBER}</td>
                    </tr>
                    <tr>
                      <th>Paydate</th>
                      <td>{detail.PAYDATE ?? "-"}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <datalist id="chequeOptions">
        {chequeOptions.map((cheque) => (
          <option key={cheque} value={cheque} />
        ))}
      </datalist>

      <AppFooter />
    </div>
  );
}

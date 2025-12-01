'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "../cheques/page.module.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

type CpayRow = {
  IDPAY: string;
  PAYNAME: string | null;
  PAYTYPE: string | null;
};

type CpayDetail = CpayRow;

type ApiResult = {
  items: CpayRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function CpaysPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editIdpay, setEditIdpay] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    idpay: "",
    payname: "",
    paytype: "",
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CpayDetail | null>(null);
  const [filters, setFilters] = useState({
    idpay: "",
    payname: "",
    paytype: "",
  });

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

      if (currentFilters.idpay.trim()) params.set("idpay", currentFilters.idpay.trim());
      if (currentFilters.payname.trim()) params.set("payname", currentFilters.payname.trim());
      if (currentFilters.paytype.trim()) params.set("paytype", currentFilters.paytype.trim());

      const res = await fetch(`/api/cpays?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดข้อมูลรหัสรายรับ-รายจ่ายได้");
        setData(null);
      } else {
        setData(json);
        setPage(targetPage);
      }
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลรหัสรายรับ-รายจ่ายได้");
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

  const onCreateChange =
    (field: keyof typeof createForm) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));

  const openCreate = () => {
    setCreateForm({ idpay: "", payname: "", paytype: "" });
    setFormError(null);
    setModalMode("create");
    setEditIdpay(null);
  };

  const openEdit = async (idpay: string) => {
    setModalMode("edit");
    setEditIdpay(idpay);
    setFormError(null);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/cpays/${idpay}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "ไม่สามารถโหลดข้อมูลได้");
      } else {
        const item = json.item as CpayDetail;
        setCreateForm({
          idpay: item.IDPAY ?? "",
          payname: item.PAYNAME ?? "",
          paytype: item.PAYTYPE ?? "",
        });
      }
    } catch (err) {
      setFormError("ไม่สามารถโหลดข้อมูลได้");
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
        idpay: createForm.idpay.trim(),
        payname: createForm.payname.trim(),
        paytype: createForm.paytype.trim() || null,
      };

      if (!payload.idpay || !payload.payname) {
        setFormError("กรุณากรอกรหัสและชื่อรายรับ-รายจ่าย");
        setFormSaving(false);
        return;
      }

      const isEdit = modalMode === "edit";
      const res = await fetch(isEdit ? `/api/cpays/${editIdpay || payload.idpay}` : "/api/cpays", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json.error || "บันทึกรหัสรายรับ-รายจ่ายไม่สำเร็จ");
      } else {
        setModalMode(null);
        setCreateForm({ idpay: "", payname: "", paytype: "" });
        await fetchData(1, filters);
      }
    } catch (err) {
      setFormError("บันทึกรหัสรายรับ-รายจ่ายไม่สำเร็จ");
    } finally {
      setFormSaving(false);
    }
  };

  const openDetail = async (idpay: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/cpays/${idpay}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setDetailError(json.error || "ไม่สามารถโหลดข้อมูลได้");
      } else {
        setDetail(json.item);
      }
    } catch (err) {
      setDetailError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setDetailLoading(false);
    }
  };

  const textOrDash = (value: string | null | undefined) => (value ? value : "-");

  return (
    <div className={styles.page}>
      <AppHeader activePath="/cpays" />

      <main className={styles.main}>
        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>รหัสรายรับ-รายจ่าย</span>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                แสดง {displayRange} จาก {data?.total ?? 0} รายการ
              </span>
              <button type="button" className={styles.createBtn} onClick={openCreate}>
                + เพิ่มรหัสรายรับ-รายจ่าย
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อ</th>
                  <th>ประเภท</th>
                  <th>จัดการ</th>
                </tr>
                <tr className={styles.filterRow}>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหารหัส"
                      value={filters.idpay}
                      onChange={onFilterChange("idpay")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหาชื่อ"
                      value={filters.payname}
                      onChange={onFilterChange("payname")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ประเภท (เช่น 1/2)"
                      value={filters.paytype}
                      onChange={onFilterChange("paytype")}
                    />
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row) => (
                  <tr key={row.IDPAY}>
                    <td>{row.IDPAY}</td>
                    <td>{textOrDash(row.PAYNAME)}</td>
                    <td>{textOrDash(row.PAYTYPE)}</td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.iconBtn}
                        type="button"
                        onClick={() => openDetail(row.IDPAY)}
                        title="ดูรายละเอียด"
                      >
                        🔍
                      </button>
                      <button
                        className={styles.iconBtn}
                        type="button"
                        onClick={() => openEdit(row.IDPAY)}
                        title="แก้ไข"
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={4} className={styles.emptyState}>
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
              <h2>{modalMode === "edit" ? `แก้ไขรหัส ${createForm.idpay || editIdpay || ""}` : "เพิ่มรหัสรายรับ-รายจ่าย"}</h2>
              <button className={styles.modalClose} onClick={() => setModalMode(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalHint}>
                ช่องที่มี * จำเป็นต้องกรอก {modalLoading ? "กำลังโหลด..." : ""}
              </p>
              <div className={styles.formGrid}>
                <label>
                  รหัส *
                  <input className={styles.input} value={createForm.idpay} onChange={onCreateChange("idpay")} />
                </label>
                <label>
                  ชื่อ *
                  <input className={styles.input} value={createForm.payname} onChange={onCreateChange("payname")} />
                </label>
                <label>
                  ประเภท
                  <input className={styles.input} value={createForm.paytype} onChange={onCreateChange("paytype")} />
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
              <h2>{detail?.IDPAY ? `รายละเอียดรหัส ${detail.IDPAY}` : "รายละเอียดรหัสรายรับ-รายจ่าย"}</h2>
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
                      <th>รหัส</th>
                      <td>{detail.IDPAY}</td>
                    </tr>
                    <tr>
                      <th>ชื่อ</th>
                      <td>{textOrDash(detail.PAYNAME)}</td>
                    </tr>
                    <tr>
                      <th>ประเภท</th>
                      <td>{textOrDash(detail.PAYTYPE)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

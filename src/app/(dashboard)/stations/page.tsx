'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "../cheques/page.module.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

type StationRow = {
  CODE: string;
  DEPART: string | null;
  CODEPLACE: string | null;
  NAMESTATION: string | null;
};

type StationDetail = StationRow;

type ApiResult = {
  items: StationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function StationsPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editCode, setEditCode] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    code: "",
    namestation: "",
    depart: "",
    codeplace: "",
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StationDetail | null>(null);
  const [filters, setFilters] = useState({
    code: "",
    namestation: "",
    depart: "",
    codeplace: "",
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

      if (currentFilters.code.trim()) params.set("code", currentFilters.code.trim());
      if (currentFilters.namestation.trim())
        params.set("namestation", currentFilters.namestation.trim());
      if (currentFilters.depart.trim()) params.set("depart", currentFilters.depart.trim());
      if (currentFilters.codeplace.trim()) params.set("codeplace", currentFilters.codeplace.trim());

      const res = await fetch(`/api/stations?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดข้อมูลรหัสสถานที่ปฏิบัติงานได้");
        setData(null);
      } else {
        setData(json);
        setPage(targetPage);
      }
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลรหัสสถานที่ปฏิบัติงานได้");
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
    setCreateForm({ code: "", namestation: "", depart: "", codeplace: "" });
    setFormError(null);
    setModalMode("create");
    setEditCode(null);
  };

  const openEdit = async (codeId: string) => {
    setModalMode("edit");
    setEditCode(codeId);
    setFormError(null);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/stations/${codeId}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "ไม่สามารถโหลดข้อมูลสถานที่ปฏิบัติงานได้");
      } else {
        const item = json.item as StationDetail;
        setCreateForm({
          code: item.CODE ?? "",
          namestation: item.NAMESTATION ?? "",
          depart: item.DEPART ?? "",
          codeplace: item.CODEPLACE ?? "",
        });
      }
    } catch (err) {
      setFormError("ไม่สามารถโหลดข้อมูลสถานที่ปฏิบัติงานได้");
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
        code: createForm.code.trim(),
        namestation: createForm.namestation.trim(),
        depart: createForm.depart.trim() || null,
        codeplace: createForm.codeplace.trim() || null,
      };

      if (!payload.code || !payload.namestation) {
        setFormError("กรุณากรอกทั้งรหัสและชื่อสถานที่");
        setFormSaving(false);
        return;
      }

      const isEdit = modalMode === "edit";
      const res = await fetch(isEdit ? `/api/stations/${editCode || payload.code}` : "/api/stations", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json.error || "บันทึกรหัสสถานที่ปฏิบัติงานไม่สำเร็จ");
      } else {
        setModalMode(null);
        setCreateForm({ code: "", namestation: "", depart: "", codeplace: "" });
        await fetchData(1, filters);
      }
    } catch (err) {
      setFormError("บันทึกรหัสสถานที่ปฏิบัติงานไม่สำเร็จ");
    } finally {
      setFormSaving(false);
    }
  };

  const openDetail = async (codeId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/stations/${codeId}`, {
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
      <AppHeader activePath="/stations" />

      <main className={styles.main}>
        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>รหัสสถานที่ปฏิบัติงาน</span>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                แสดง {displayRange} จาก {data?.total ?? 0} รายการ
              </span>
              <button type="button" className={styles.createBtn} onClick={openCreate}>
                + เพิ่มรหัสสถานที่
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อสถานที่</th>
                  <th>สังกัด/หน่วยงาน</th>
                  <th>รหัสสถานที่ (CODEPLACE)</th>
                  <th>จัดการ</th>
                </tr>
                <tr className={styles.filterRow}>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหารหัส"
                      value={filters.code}
                      onChange={onFilterChange("code")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหาชื่อสถานที่"
                      value={filters.namestation}
                      onChange={onFilterChange("namestation")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหาสังกัด/หน่วยงาน"
                      value={filters.depart}
                      onChange={onFilterChange("depart")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="ค้นหารหัส CODEPLACE"
                      value={filters.codeplace}
                      onChange={onFilterChange("codeplace")}
                    />
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row) => (
                  <tr key={row.CODE}>
                    <td>{row.CODE}</td>
                    <td>{textOrDash(row.NAMESTATION)}</td>
                    <td>{textOrDash(row.DEPART)}</td>
                    <td>{textOrDash(row.CODEPLACE)}</td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.iconBtn}
                        type="button"
                        onClick={() => openDetail(row.CODE)}
                        title="ดูรายละเอียด"
                      >
                        🔍
                      </button>
                      <button
                        className={styles.iconBtn}
                        type="button"
                        onClick={() => openEdit(row.CODE)}
                        title="แก้ไข"
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={5} className={styles.emptyState}>
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
              <h2>{modalMode === "edit" ? `แก้ไขรหัส ${createForm.code || editCode || ""}` : "เพิ่มรหัสสถานที่"}</h2>
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
                  <input className={styles.input} value={createForm.code} onChange={onCreateChange("code")} />
                </label>
                <label>
                  ชื่อสถานที่ *
                  <input
                    className={styles.input}
                    value={createForm.namestation}
                    onChange={onCreateChange("namestation")}
                  />
                </label>
                <label>
                  สังกัด/หน่วยงาน
                  <input className={styles.input} value={createForm.depart} onChange={onCreateChange("depart")} />
                </label>
                <label>
                  CODEPLACE
                  <input
                    className={styles.input}
                    value={createForm.codeplace}
                    onChange={onCreateChange("codeplace")}
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
              <h2>{detail?.CODE ? `รายละเอียดรหัส ${detail.CODE}` : "รายละเอียดรหัสสถานที่"}</h2>
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
                      <td>{detail.CODE}</td>
                    </tr>
                    <tr>
                      <th>ชื่อสถานที่</th>
                      <td>{textOrDash(detail.NAMESTATION)}</td>
                    </tr>
                    <tr>
                      <th>สังกัด/หน่วยงาน</th>
                      <td>{textOrDash(detail.DEPART)}</td>
                    </tr>
                    <tr>
                      <th>CODEPLACE</th>
                      <td>{textOrDash(detail.CODEPLACE)}</td>
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

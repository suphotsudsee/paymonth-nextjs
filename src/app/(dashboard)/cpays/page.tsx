'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

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
  // ตัวกรองของการโหลดครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า (Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [pageSize, setPageSize] = useState(10);
  useReloadOnPageSizeChange(pageSize, () => void fetchData(1, appliedFilters));

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
        setAppliedFilters(currentFilters);
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
  }, [data, page, pageSize]);


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
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/cpays" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>รหัสรายรับ-รายจ่าย</span>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                แสดง {displayRange} จาก {data?.total ?? 0} รายการ
              </span>
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                + เพิ่มรหัสรายรับ-รายจ่าย
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อ</th>
                  <th>ประเภท</th>
                  <th>จัดการ</th>
                </tr>
                <tr>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="ค้นหารหัส"
                      value={filters.idpay}
                      onChange={onFilterChange("idpay")}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="ค้นหาชื่อ"
                      value={filters.payname}
                      onChange={onFilterChange("payname")}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
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
                    <td className="text-center text-nowrap">
                      <button
                        className="btn btn-sm btn-outline-primary mx-1"
                        type="button"
                        onClick={() => openDetail(row.IDPAY)}
                        title="ดูรายละเอียด"
                      >
                        🔍
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary mx-1"
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
                    <td colSpan={4} className="text-center text-secondary p-3">
                      {loading ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={pageSize}
              disabled={loading}
              onPageChange={(p) => fetchData(p, appliedFilters)}
              onPageSizeChange={setPageSize}
            />
          )}
        </section>
      </main>

      {modalMode && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"><div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5">{modalMode === "edit" ? `แก้ไขรหัส ${createForm.idpay || editIdpay || ""}` : "เพิ่มรหัสรายรับ-รายจ่าย"}</h2>
              <button className="btn-close" onClick={() => setModalMode(null)} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p className="small text-secondary mb-2">
                ช่องที่มี * จำเป็นต้องกรอก {modalLoading ? "กำลังโหลด..." : ""}
              </p>
              <div className="row row-cols-1 row-cols-md-2 g-3">
                <label>
                  รหัส *
                  <input className="form-control" value={createForm.idpay} onChange={onCreateChange("idpay")} />
                </label>
                <label>
                  ชื่อ *
                  <input className="form-control" value={createForm.payname} onChange={onCreateChange("payname")} />
                </label>
                <label>
                  ประเภท
                  <input className="form-control" value={createForm.paytype} onChange={onCreateChange("paytype")} />
                </label>
              </div>
              {formError && <div className="alert alert-danger py-2 px-3 m-2 small">{formError}</div>}
              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary" onClick={submitForm} disabled={formSaving || modalLoading}>
                  {formSaving ? "Saving..." : "Save"}
                </button>
                <button className="btn btn-outline-secondary" type="button" onClick={() => setModalMode(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div></div>
        </div>
      )}

      {detailOpen && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"><div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5">{detail?.IDPAY ? `รายละเอียดรหัส ${detail.IDPAY}` : "รายละเอียดรหัสรายรับ-รายจ่าย"}</h2>
              <button className="btn-close" onClick={() => setDetailOpen(false)} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {detailLoading && <p className="small text-secondary mb-2">กำลังโหลด...</p>}
              {detailError && <div className="alert alert-danger py-2 px-3 m-2 small">{detailError}</div>}
              {detail && (
                <table className="table table-sm table-bordered mb-0">
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
          </div></div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

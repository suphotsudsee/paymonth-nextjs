'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

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
const CHEQUE_MIN_LENGTH = 5;
const BANGKOK_TIMEZONE = "Asia/Bangkok";

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
  // ตัวกรองของการโหลดครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า (Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [sortBy, setSortBy] = useState<"CHEQUE" | "CHEQUENAME" | "ACCNUMBER" | "PAYDATE">("CHEQUE");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [chequeOptions, setChequeOptions] = useState<string[]>([]);
  const [chequeQuery, setChequeQuery] = useState("");

  const [pageSize, setPageSize] = useState(10);
  useReloadOnPageSizeChange(pageSize, () => void fetchData(1, appliedFilters));
  const fetchData = async (
    targetPage: number,
    currentFilters: typeof filters = filters,
    currentSortBy: typeof sortBy = sortBy,
    currentSortDir: typeof sortDir = sortDir,
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
      if (currentSortBy) params.set("sortBy", currentSortBy);
      params.set("sortDir", currentSortDir);

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
        setAppliedFilters(currentFilters);
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
      void fetchData(1, filters, sortBy, sortDir);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    setPage(1);
    void fetchData(1, filters, sortBy, sortDir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortDir]);

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

  const applySort = (field: "CHEQUE" | "CHEQUENAME" | "ACCNUMBER" | "PAYDATE") => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return field;
    });
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
    const trimmedCheque = createForm.cheque.trim();
    if (trimmedCheque.length < CHEQUE_MIN_LENGTH || trimmedCheque.length > CHEQUE_MAX_LENGTH) {
      setFormError(`Cheque must be between ${CHEQUE_MIN_LENGTH} and ${CHEQUE_MAX_LENGTH} characters.`);
      return;
    }
    setFormSaving(true);
    setFormError(null);
    try {
      const payload = {
        cheque: trimmedCheque,
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
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: BANGKOK_TIMEZONE,
    });
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/cheques" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>ทะเบียนเช็ค</span>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                แสดง {displayRange} จากทั้งหมด {data?.total ?? 0} รายการ
              </span>
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                + เพิ่มทะเบียนเช็ค
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>
                    <button
                      type="button"
                      className={`btn btn-link btn-sm p-0 fw-semibold text-decoration-none text-nowrap ${sortBy === "CHEQUE" ? "text-decoration-underline" : ""}`}
                      onClick={() => applySort("CHEQUE")}
                    >
                      เลขที่เช็ค
                      {sortBy === "CHEQUE" && <span className="badge text-bg-primary ms-1">{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className={`btn btn-link btn-sm p-0 fw-semibold text-decoration-none text-nowrap ${sortBy === "CHEQUENAME" ? "text-decoration-underline" : ""}`}
                      onClick={() => applySort("CHEQUENAME")}
                    >
                      ชื่อเช็ค
                      {sortBy === "CHEQUENAME" && <span className="badge text-bg-primary ms-1">{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className={`btn btn-link btn-sm p-0 fw-semibold text-decoration-none text-nowrap ${sortBy === "ACCNUMBER" ? "text-decoration-underline" : ""}`}
                      onClick={() => applySort("ACCNUMBER")}
                    >
                      เลขบัญชี
                      {sortBy === "ACCNUMBER" && <span className="badge text-bg-primary ms-1">{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className={`btn btn-link btn-sm p-0 fw-semibold text-decoration-none text-nowrap ${sortBy === "PAYDATE" ? "text-decoration-underline" : ""}`}
                      onClick={() => applySort("PAYDATE")}
                    >
                      วันที่จ่าย
                      {sortBy === "PAYDATE" && <span className="badge text-bg-primary ms-1">{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>อัปเดตล่าสุด</th>
                  <th>เครื่องมือ</th>
                </tr>
                <tr>
                  <th>
                    <input
                      className="form-control form-control-sm"
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
                      className="form-control form-control-sm"
                      placeholder="ค้นหา ชื่อเช็ค"
                      value={filters.chequename}
                      onChange={onFilterChange("chequename")}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="ค้นหา เลขบัญชี"
                      value={filters.accnumber}
                      onChange={onFilterChange("accnumber")}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
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
                    <td className="text-center">{formatDate(row.PAYDATE)}</td>
                    <td className="text-center">{formatDate(row.DUPDATE)}</td>
                    <td className="text-center text-nowrap">
                      <button
                        className="btn btn-sm btn-outline-primary mx-1"
                        title="ดูรายละเอียด"
                        type="button"
                        onClick={() => openDetail(row.CHEQUE)}
                      >
                        🔍
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary mx-1"
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
                    <td colSpan={6} className="text-center text-secondary p-3">
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
              <h2 className="modal-title fs-5">
                {modalMode === "edit" ? `Update Cheque ${createForm.cheque || editCheque || ""}` : "Create Cheque"}
              </h2>
              <button className="btn-close" onClick={() => setModalMode(null)} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p className="small text-secondary mb-2">
                Fields with * are required. {modalLoading ? "กำลังโหลด..." : ""}
              </p>
              <div className="row row-cols-1 row-cols-md-2 g-3">
                <label>
                  Cheque *
                  <input
                    className="form-control"
                    maxLength={CHEQUE_MAX_LENGTH}
                    minLength={CHEQUE_MIN_LENGTH}
                    required
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
                  <input className="form-control" value={createForm.chequename} onChange={onCreateChange("chequename")} />
                </label>
                <label>
                  Accnumber *
                  <input className="form-control" value={createForm.accnumber} onChange={onCreateChange("accnumber")} />
                </label>
                <label>
                  Paydate
                  <input
                    className="form-control"
                    type="date"
                    value={createForm.paydate}
                    onChange={onCreateChange("paydate")}
                  />
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
              <h2 className="modal-title fs-5">{detail?.CHEQUE ? `View Cheque ${detail.CHEQUE}` : "View Cheque"}</h2>
              <button className="btn-close" onClick={() => setDetailOpen(false)} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              {detailLoading && <p className="small text-secondary mb-2">กำลังโหลด...</p>}
              {detailError && <div className="alert alert-danger py-2 px-3 m-2 small">{detailError}</div>}
              {detail && (
                <table className="table table-sm table-bordered mb-0">
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
          </div></div>
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

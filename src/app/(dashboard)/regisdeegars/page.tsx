'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

type RegisRow = {
  PNUMBER: string;
  NAME: string;
  MONEY: number;
  TAX: number;
  MONEYDRAW: number;
  REGISDATE: string;
  SENDDATE: string | null;
  DUPDATE: string;
};

type RegisDetail = {
  ID: number;
  PNUMBER: string;
  NAME: string;
  MONEY: number;
  TAX: number;
  MONEYDRAW: number;
  REGISDATE: string;
  SENDDATE: string | null;
  CODEBUDGET: string;
  CODEACTIVE: string;
  GFMISNUMBER: string;
};

type ApiResult = {
  items: RegisRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PNUMBER_MAX_LENGTH = 10;
const BANGKOK_TIMEZONE = "Asia/Bangkok";

export default function RegisdeegarsListPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editPnumber, setEditPnumber] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<RegisDetail | null>(null);
  const [pnumberOptions, setPnumberOptions] = useState<string[]>([]);
  const [pnumberQuery, setPnumberQuery] = useState("");
  const [form, setForm] = useState({
    pnumber: "",
    name: "",
    money: "0.00",
    tax: "0.00",
    moneydraw: "0.00",
    regisdate: "",
    senddate: "",
    codebudget: "",
    codeactive: "",
    gfmisnumber: "",
  });
  const [filters, setFilters] = useState({
    pnumber: "",
    name: "",
    codebudget: "",
    regisdate: "",
    senddate: "",
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
      if (currentFilters.pnumber.trim()) params.set("pnumber", currentFilters.pnumber.trim());
      if (currentFilters.name.trim()) params.set("name", currentFilters.name.trim());
      if (currentFilters.codebudget.trim()) params.set("codebudget", currentFilters.codebudget.trim());
      if (currentFilters.regisdate.trim()) params.set("regisdate", currentFilters.regisdate.trim());
      if (currentFilters.senddate.trim()) params.set("senddate", currentFilters.senddate.trim());

      const res = await fetch(`/api/regisdeegars?${params.toString()}`, {
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

  const onPnumberFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, pnumber: value }));
    setPnumberQuery(value);
  };

  const onFormChange =
    (field: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const onPnumberFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, pnumber: value }));
    setPnumberQuery(value);
  };

  const loadPnumberOptions = async (query: string) => {
    try {
      const trimmed = query.trim();
      const params = new URLSearchParams({
        page: "1",
        pageSize: "10",
        pnumberOnly: "1",
        recent: "1",
      });
      if (trimmed.length >= 2) {
        params.set("pnumber", trimmed);
      }
      const res = await fetch(`/api/deegars?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || !Array.isArray(json.items)) {
        setPnumberOptions([]);
        return;
      }
      const items = (json.items as { PNUMBER?: string }[])
        .map((item) => String(item.PNUMBER || "").trim())
        .filter(Boolean);
      setPnumberOptions(Array.from(new Set(items)));
    } catch {
      setPnumberOptions([]);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadPnumberOptions(pnumberQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [pnumberQuery]);

  const openCreate = () => {
    setForm({
      pnumber: "",
      name: "",
      money: "0.00",
      tax: "0.00",
      moneydraw: "0.00",
      regisdate: "",
      senddate: "",
      codebudget: "",
      codeactive: "",
      gfmisnumber: "",
    });
    setEditPnumber(null);
    setFormError(null);
    setModalMode("create");
  };

  const openEdit = async (pnumber: string) => {
    setModalMode("edit");
    setEditPnumber(pnumber);
    setFormError(null);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/regisdeegars/${pnumber}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "ไม่สามารถโหลดข้อมูลทะเบียนคุมเบิกจ่ายได้");
      } else {
        const item = json.item as RegisDetail;
        setForm({
          pnumber: item.PNUMBER ?? "",
          name: item.NAME ?? "",
          money: String(item.MONEY ?? "0.00"),
          tax: String(item.TAX ?? "0.00"),
          moneydraw: String(item.MONEYDRAW ?? "0.00"),
          regisdate: item.REGISDATE ? item.REGISDATE.slice(0, 10) : "",
          senddate: item.SENDDATE ? item.SENDDATE.slice(0, 10) : "",
          codebudget: item.CODEBUDGET ?? "",
          codeactive: item.CODEACTIVE ?? "",
          gfmisnumber: item.GFMISNUMBER ?? "",
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
        pnumber: form.pnumber.trim(),
        name: form.name.trim(),
        money: Number(form.money || 0),
        tax: Number(form.tax || 0),
        moneydraw: Number(form.moneydraw || 0),
        regisdate: form.regisdate ? form.regisdate : null,
        senddate: form.senddate ? form.senddate : null,
        codebudget: form.codebudget.trim(),
        codeactive: form.codeactive.trim(),
        gfmisnumber: form.gfmisnumber.trim(),
      };

      if (!payload.pnumber || !payload.name || !payload.codebudget || !payload.codeactive || !payload.gfmisnumber) {
        setFormError("กรอกข้อมูลที่จำเป็นให้ครบ");
        setFormSaving(false);
        return;
      }

      const isEdit = modalMode === "edit";
      const res = await fetch(isEdit ? `/api/regisdeegars/${editPnumber || payload.pnumber}` : "/api/regisdeegars", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json.error || "บันทึกไม่สำเร็จ");
      } else {
        setModalMode(null);
        setForm({
          pnumber: "",
          name: "",
          money: "0.00",
          tax: "0.00",
          moneydraw: "0.00",
          regisdate: "",
          senddate: "",
          codebudget: "",
          codeactive: "",
          gfmisnumber: "",
        });
        await fetchData(1, filters);
      }
    } catch (err) {
      setFormError("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setFormSaving(false);
    }
  };

  const openDetail = async (pnumber: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/regisdeegars/${pnumber}`, {
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
      setDetailError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatNumber = (value: number) =>
    Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: BANGKOK_TIMEZONE,
    });
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/regisdeegars" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>ทะเบียนคุมเบิกจ่ายฎีกา</span>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                แสดง {displayRange} จากทั้งหมด {data?.total ?? 0} รายการ
              </span>
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                + เพิ่มทะเบียนคุมเบิกจ่ายฎีกา
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>Pnumber</th>
                  <th>ชื่อ</th>
                  <th>จำนวนเงิน</th>
                  <th>ภาษี</th>
                  <th>เงินโอน</th>
                  <th>วันที่รับ</th>
                  <th>วันที่ส่ง</th>
                  <th>อัปเดตล่าสุด</th>
                  <th>เครื่องมือ</th>
                </tr>
                <tr>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="ค้นหา Pnumber"
                      maxLength={PNUMBER_MAX_LENGTH}
                      value={filters.pnumber}
                      list="pnumberOptions"
                      onChange={onPnumberFilterChange}
                      onFocus={(e) => {
                        void loadPnumberOptions(e.currentTarget.value);
                      }}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="ค้นหา ชื่อ"
                      value={filters.name}
                      onChange={onFilterChange("name")}
                    />
                  </th>
                  <th />
                  <th />
                  <th />
                  <th>
                    <input
                      className="form-control form-control-sm"
                      type="date"
                      value={filters.regisdate}
                      onChange={onFilterChange("regisdate")}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      type="date"
                      value={filters.senddate}
                      onChange={onFilterChange("senddate")}
                    />
                  </th>
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row, idx) => (
                  <tr key={`${row.PNUMBER}-${idx}`}>
                    <td>{row.PNUMBER}</td>
                    <td>{row.NAME}</td>
                    <td className="text-end text-nowrap">{formatNumber(row.MONEY)}</td>
                    <td className="text-end text-nowrap">{formatNumber(row.TAX)}</td>
                    <td className="text-end text-nowrap">{formatNumber(row.MONEYDRAW)}</td>
                    <td>{formatDate(row.REGISDATE)}</td>
                    <td>{formatDate(row.SENDDATE)}</td>
                    <td>{formatDate(row.DUPDATE)}</td>
                    <td className="text-center text-nowrap">
                      <button
                        className="btn btn-sm btn-outline-primary mx-1"
                        title="ดูรายละเอียด"
                        type="button"
                        onClick={() => openDetail(row.PNUMBER)}
                      >
                        🔍
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary mx-1"
                        title="แก้ไข"
                        type="button"
                        onClick={() => openEdit(row.PNUMBER)}
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={9} className="text-center text-secondary p-3">
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
              <h2 className="modal-title fs-5">{modalMode === "edit" ? `Update Regis ${editPnumber ?? ""}` : "Create Regis"}</h2>
              <button className="btn-close" onClick={() => setModalMode(null)} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <p className="small text-secondary mb-2">
                Fields with * are required. {modalLoading ? "กำลังโหลด..." : ""}
              </p>
              <div className="row row-cols-1 row-cols-md-2 g-3">
                <label>
                  Pnumber *
                  <input
                    className="form-control"
                    maxLength={PNUMBER_MAX_LENGTH}
                    value={form.pnumber}
                    list="pnumberOptions"
                    onChange={onPnumberFormChange}
                    onFocus={(e) => {
                      void loadPnumberOptions(e.currentTarget.value);
                    }}
                  />
                </label>
                <label>
                  ชื่อ *
                  <input className="form-control" value={form.name} onChange={onFormChange("name")} />
                </label>
                <label>
                  จำนวนเงิน *
                  <input className="form-control" value={form.money} onChange={onFormChange("money")} />
                </label>
                <label>
                  ภาษี *
                  <input className="form-control" value={form.tax} onChange={onFormChange("tax")} />
                </label>
                <label>
                  เงินโอน *
                  <input className="form-control" value={form.moneydraw} onChange={onFormChange("moneydraw")} />
                </label>
                <label>
                  วันที่รับ *
                  <input
                    className="form-control"
                    type="date"
                    value={form.regisdate}
                    onChange={onFormChange("regisdate")}
                  />
                </label>
                <label>
                  วันที่ส่ง
                  <input
                    className="form-control"
                    type="date"
                    value={form.senddate}
                    onChange={onFormChange("senddate")}
                  />
                </label>
                <label>
                  CODEBUDGET *
                  <input className="form-control" value={form.codebudget} onChange={onFormChange("codebudget")} />
                </label>
                <label>
                  CODEACTIVE *
                  <input className="form-control" value={form.codeactive} onChange={onFormChange("codeactive")} />
                </label>
                <label>
                  GFMISNUMBER *
                  <input className="form-control" value={form.gfmisnumber} onChange={onFormChange("gfmisnumber")} />
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
              <h2 className="modal-title fs-5">{detail?.PNUMBER ? `View Regis ${detail.PNUMBER}` : "View Regis"}</h2>
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
                      <th>Pnumber</th>
                      <td>{detail.PNUMBER}</td>
                    </tr>
                    <tr>
                      <th>ชื่อ</th>
                      <td>{detail.NAME}</td>
                    </tr>
                    <tr>
                      <th>จำนวนเงิน</th>
                      <td className="text-end text-nowrap">{formatNumber(detail.MONEY)}</td>
                    </tr>
                    <tr>
                      <th>ภาษี</th>
                      <td className="text-end text-nowrap">{formatNumber(detail.TAX)}</td>
                    </tr>
                    <tr>
                      <th>เงินโอน</th>
                      <td className="text-end text-nowrap">{formatNumber(detail.MONEYDRAW)}</td>
                    </tr>
                    <tr>
                      <th>วันที่รับ</th>
                      <td>{formatDate(detail.REGISDATE)}</td>
                    </tr>
                    <tr>
                      <th>วันที่ส่ง</th>
                      <td>{formatDate(detail.SENDDATE)}</td>
                    </tr>
                    <tr>
                      <th>CODEBUDGET</th>
                      <td>{detail.CODEBUDGET}</td>
                    </tr>
                    <tr>
                      <th>CODEACTIVE</th>
                      <td>{detail.CODEACTIVE}</td>
                    </tr>
                    <tr>
                      <th>GFMISNUMBER</th>
                      <td>{detail.GFMISNUMBER}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div></div>
        </div>
      )}

      <datalist id="pnumberOptions">
        {pnumberOptions.map((pnumber) => (
          <option key={pnumber} value={pnumber} />
        ))}
      </datalist>

      <AppFooter />
    </div>
  );
}

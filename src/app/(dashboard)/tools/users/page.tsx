'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

type UserRow = {
  id: number;
  username: string;
  password: string;
  cid: string;
  fname: string;
  lname: string;
  status: string;
  accessLevel: number;
  mobile: string;
  email: string;
};

type ApiResult = {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const emptyForm = {
  username: "",
  password: "",
  cid: "",
  fname: "",
  lname: "",
  status: "",
  accessLevel: "0",
  mobile: "",
  email: "",
};

export default function ManageUsersPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    id: "",
    username: "",
    cid: "",
    fname: "",
    lname: "",
  });
  // ตัวกรองของการโหลดครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า (Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [pageSize, setPageSize] = useState(10);
  useReloadOnPageSizeChange(pageSize, () => void fetchUsers(1, appliedFilters));

  const fetchUsers = async (targetPage: number, currentFilters: typeof filters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });

      if (currentFilters.id.trim()) params.set("id", currentFilters.id.trim());
      if (currentFilters.username.trim()) params.set("username", currentFilters.username.trim());
      if (currentFilters.cid.trim()) params.set("cid", currentFilters.cid.trim());
      if (currentFilters.fname.trim()) params.set("fname", currentFilters.fname.trim());
      if (currentFilters.lname.trim()) params.set("lname", currentFilters.lname.trim());

      const res = await fetch(`/api/users?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดรายการผู้ใช้ได้");
        setData(null);
      } else {
        setData(json);
        setAppliedFilters(currentFilters);
        setPage(targetPage);
      }
    } catch (_err) {
      setError("ไม่สามารถโหลดรายการผู้ใช้ได้");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void fetchUsers(1, filters);
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


  const setFilterField =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setSelectedUser(null);
    setFormError(null);
    setModalMode("create");
  };

  const loadUserDetail = async (id: number, mode: "view" | "edit") => {
    setModalMode(mode);
    setModalLoading(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/users/${id}`, { cache: "no-store", credentials: "include" });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
        return;
      }
      const user = json.user as UserRow;
      setSelectedUser(user);
      setForm({
        username: user.username ?? "",
        password: "",
        cid: user.cid ?? "",
        fname: user.fname ?? "",
        lname: user.lname ?? "",
        status: user.status ?? "",
        accessLevel: String(user.accessLevel ?? 0),
        mobile: user.mobile ?? "",
        email: user.email ?? "",
      });
    } catch (_err) {
      setFormError("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    } finally {
      setModalLoading(false);
    }
  };

  const submitForm = async () => {
    if (!modalMode) return;
    setSubmitCount((n) => n + 1); // ซ่อนรหัสผ่านที่กดดูไว้ ทุกครั้งที่กดบันทึก (สำเร็จหรือไม่ก็ตาม)
    setFormSaving(true);
    setFormError(null);
    try {
      const payload = {
        username: form.username.trim(),
        password: form.password.trim(),
        cid: form.cid.trim(),
        fname: form.fname.trim(),
        lname: form.lname.trim(),
        status: form.status.trim(),
        accessLevel: Number(form.accessLevel || 0),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
      };

      if (!payload.username || !payload.cid || (modalMode === "create" && !payload.password)) {
        setFormError("กรอกข้อมูลที่จำเป็นให้ครบ");
        setFormSaving(false);
        return;
      }

      const isEdit = modalMode === "edit";
      if (isEdit && !selectedUser?.id) {
        setFormError("ไม่พบผู้ใช้ที่ต้องการแก้ไข");
        setFormSaving(false);
        return;
      }

      const url = isEdit ? `/api/users/${selectedUser?.id ?? ""}` : "/api/users";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setFormError(json.error || "ไม่สามารถบันทึกข้อมูลได้");
        return;
      }

      closeModal();
      await fetchUsers(1, filters);
    } catch (_err) {
      setFormError("ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setFormSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("ยืนยันการลบผู้ใช้คนนี้?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "ไม่สามารถลบผู้ใช้ได้");
      } else {
        await fetchUsers(1, filters);
      }
    } catch (_err) {
      setError("ไม่สามารถลบผู้ใช้ได้");
    }
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/tools/users" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <div className="mb-3">
          <h1 className="h4 mb-0">รายชื่อสมาชิก</h1>
        </div>

        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>จัดการผู้ใช้</span>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                Displaying {displayRange} of {data?.total ?? 0} results.
              </span>
              <button className="btn btn-primary" type="button" onClick={openCreate}>
                + Create User
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>CID</th>
                  <th>Fname</th>
                  <th>Lname</th>
                  <th className="text-center text-nowrap">เครื่องมือ</th>
                </tr>
                <tr>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={filters.id}
                      onChange={setFilterField("id")}
                      placeholder="ค้นหา ID"
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={filters.username}
                      onChange={setFilterField("username")}
                      placeholder="ค้นหา Username"
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={filters.cid}
                      onChange={setFilterField("cid")}
                      placeholder="ค้นหา CID"
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={filters.fname}
                      onChange={setFilterField("fname")}
                      placeholder="ค้นหา Fname"
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      value={filters.lname}
                      onChange={setFilterField("lname")}
                      placeholder="ค้นหา Lname"
                    />
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6}>กำลังโหลด...</td>
                  </tr>
                )}
                {!loading && data?.items?.length === 0 && (
                  <tr>
                    <td className="text-center text-secondary p-3" colSpan={6}>
                      ไม่พบข้อมูลผู้ใช้
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.items?.map((row) => (
                    <tr key={row.id}>
                      <td>{row.id}</td>
                      <td>{row.username}</td>
                      <td>{row.cid}</td>
                      <td>{row.fname}</td>
                      <td>{row.lname}</td>
                      <td className="text-center text-nowrap">
                        <div className="text-center text-nowrap">
                          <button
                            className="btn btn-sm btn-outline-primary mx-1"
                            type="button"
                            onClick={() => loadUserDetail(row.id, "view")}
                          >
                            ดู
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary mx-1"
                            type="button"
                            onClick={() => loadUserDetail(row.id, "edit")}
                          >
                            แก้ไข
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary mx-1"
                            type="button"
                            onClick={() => handleDelete(row.id)}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
              onPageChange={(p) => fetchUsers(p, appliedFilters)}
              onPageSizeChange={setPageSize}
            />
          )}
        </section>
      </main>

      <AppFooter />

      {modalMode && (
        <div className="modal d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"><div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5">
                {modalMode === "create"
                  ? "สร้างผู้ใช้ใหม่"
                  : modalMode === "edit"
                    ? "แก้ไขผู้ใช้"
                    : "รายละเอียดผู้ใช้"}
              </h2>
              <button className="btn-close" type="button" onClick={closeModal} aria-label="ปิด"></button>
            </div>

            <div className="modal-body">
              {formError && <div className="alert alert-danger py-2 px-3 m-2 small">{formError}</div>}
              {modalLoading ? (
                <div>กำลังโหลด...</div>
              ) : modalMode === "view" ? (
                <div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">ID</span>
                    <strong className="col">{selectedUser?.id ?? "-"}</strong>
                  </div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">Username</span>
                    <strong className="col">{selectedUser?.username ?? "-"}</strong>
                  </div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">CID</span>
                    <strong className="col">{selectedUser?.cid ?? "-"}</strong>
                  </div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">ชื่อ</span>
                    <strong className="col">{selectedUser?.fname ?? "-"}</strong>
                  </div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">นามสกุล</span>
                    <strong className="col">{selectedUser?.lname ?? "-"}</strong>
                  </div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">สถานะ</span>
                    <strong className="col">{selectedUser?.status ?? "-"}</strong>
                  </div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">สิทธิ์</span>
                    <strong className="col">{selectedUser?.accessLevel ?? 0}</strong>
                  </div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">Mobile</span>
                    <strong className="col">{selectedUser?.mobile ?? "-"}</strong>
                  </div>
                  <div className="row mx-0 py-2 border-bottom small">
                    <span className="col-5 col-sm-4 text-secondary">Email</span>
                    <strong className="col">{selectedUser?.email ?? "-"}</strong>
                  </div>
                </div>
              ) : (
                <>
                  <div className="row row-cols-1 row-cols-md-2 g-3">
                    <label>
                      Username
                      <input
                        className="form-control"
                        value={form.username}
                        onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                      />
                    </label>
                    <label>
                      รหัสผ่าน (ปล่อยว่างเพื่อไม่เปลี่ยน)
                      <PasswordInput
                        className="form-control"
                        autoComplete="new-password"
                        concealKey={submitCount}
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </label>
                    <label>
                      CID
                      <input
                        className="form-control"
                        value={form.cid}
                        onChange={(e) => setForm((prev) => ({ ...prev, cid: e.target.value }))}
                      />
                    </label>
                    <label>
                      ชื่อ
                      <input
                        className="form-control"
                        value={form.fname}
                        onChange={(e) => setForm((prev) => ({ ...prev, fname: e.target.value }))}
                      />
                    </label>
                    <label>
                      นามสกุล
                      <input
                        className="form-control"
                        value={form.lname}
                        onChange={(e) => setForm((prev) => ({ ...prev, lname: e.target.value }))}
                      />
                    </label>
                    <label>
                      สถานะ
                      <input
                        className="form-control"
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                      />
                    </label>
                    <label>
                      Access Level
                      <input
                        className="form-control"
                        type="number"
                        value={form.accessLevel}
                        onChange={(e) => setForm((prev) => ({ ...prev, accessLevel: e.target.value }))}
                      />
                    </label>
                    <label>
                      Mobile
                      <input
                        className="form-control"
                        value={form.mobile}
                        onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
                      />
                    </label>
                    <label>
                      Email
                      <input
                        className="form-control"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </label>
                  </div>

                  <div className="d-flex gap-2 mt-3">
                    <button className="btn btn-primary" type="button" onClick={submitForm} disabled={formSaving}>
                      {formSaving ? "Saving..." : "Save"}
                    </button>
                    <button className="btn btn-outline-secondary" type="button" onClick={closeModal} disabled={formSaving}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div></div>
        </div>
      )}
    </div>
  );
}

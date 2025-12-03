'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "../../officers/page.module.css";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";

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
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState(emptyForm);

  const pageSize = 10;

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
  }, [data, page]);

  const pageWindow = useMemo(() => {
    if (!data) return [];
    const total = data.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(page - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [data, page]);

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
    <div className={styles.page}>
      <AppHeader activePath="/tools/users" />

      <main className={styles.main}>
        <div className={styles.titleArea}>
          <h1>รายชื่อสมาชิก</h1>
        </div>

        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>จัดการผู้ใช้</span>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                Displaying {displayRange} of {data?.total ?? 0} results.
              </span>
              <button className={styles.createBtn} type="button" onClick={openCreate}>
                + Create User
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>CID</th>
                  <th>Fname</th>
                  <th>Lname</th>
                  <th className={styles.toolsCol}>เครื่องมือ</th>
                </tr>
                <tr className={styles.filterRow}>
                  <th>
                    <input
                      className={styles.filterInput}
                      value={filters.id}
                      onChange={setFilterField("id")}
                      placeholder="ค้นหา ID"
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      value={filters.username}
                      onChange={setFilterField("username")}
                      placeholder="ค้นหา Username"
                    />
                  </th>
                  <th />
                  <th>
                    <input
                      className={styles.filterInput}
                      value={filters.cid}
                      onChange={setFilterField("cid")}
                      placeholder="ค้นหา CID"
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      value={filters.fname}
                      onChange={setFilterField("fname")}
                      placeholder="ค้นหา Fname"
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
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
                    <td colSpan={7}>กำลังโหลด...</td>
                  </tr>
                )}
                {!loading && data?.items?.length === 0 && (
                  <tr>
                    <td className={styles.emptyState} colSpan={7}>
                      ไม่พบข้อมูลผู้ใช้
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.items?.map((row, idx) => (
                    <tr key={row.id} className={idx % 2 === 1 ? styles.evenRow : undefined}>
                      <td>{row.id}</td>
                      <td>{row.username}</td>
                      <td>{row.password}</td>
                      <td>{row.cid}</td>
                      <td>{row.fname}</td>
                      <td>{row.lname}</td>
                      <td className={styles.toolsCol}>
                        <div className={styles.actionsCell}>
                          <button
                            className={styles.iconBtn}
                            type="button"
                            onClick={() => loadUserDetail(row.id, "view")}
                          >
                            ดู
                          </button>
                          <button
                            className={styles.iconBtn}
                            type="button"
                            onClick={() => loadUserDetail(row.id, "edit")}
                          >
                            แก้ไข
                          </button>
                          <button
                            className={styles.iconBtn}
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

          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page <= 1 || loading}
              onClick={() => fetchUsers(page - 1, filters)}
            >
              Prev
            </button>
            {pageWindow.map((p) => (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === page ? styles.currentPage : ""}`}
                disabled={loading}
                onClick={() => fetchUsers(p, filters)}
              >
                {p}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              disabled={!data || page >= (data?.totalPages ?? 1) || loading}
              onClick={() => fetchUsers(page + 1, filters)}
            >
              Next
            </button>
          </div>
        </section>
      </main>

      <AppFooter />

      {modalMode && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>
                {modalMode === "create"
                  ? "สร้างผู้ใช้ใหม่"
                  : modalMode === "edit"
                    ? "แก้ไขผู้ใช้"
                    : "รายละเอียดผู้ใช้"}
              </h2>
              <button className={styles.modalClose} type="button" onClick={closeModal}>
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {formError && <div className={styles.error}>{formError}</div>}
              {modalLoading ? (
                <div>กำลังโหลด...</div>
              ) : modalMode === "view" ? (
                <div>
                  <div className={styles.detailRow}>
                    <span>ID</span>
                    <strong>{selectedUser?.id ?? "-"}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Username</span>
                    <strong>{selectedUser?.username ?? "-"}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Password</span>
                    <strong>{selectedUser?.password ?? "-"}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>CID</span>
                    <strong>{selectedUser?.cid ?? "-"}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>ชื่อ</span>
                    <strong>{selectedUser?.fname ?? "-"}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>นามสกุล</span>
                    <strong>{selectedUser?.lname ?? "-"}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>สถานะ</span>
                    <strong>{selectedUser?.status ?? "-"}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>สิทธิ์</span>
                    <strong>{selectedUser?.accessLevel ?? 0}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Mobile</span>
                    <strong>{selectedUser?.mobile ?? "-"}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Email</span>
                    <strong>{selectedUser?.email ?? "-"}</strong>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.formGrid}>
                    <label>
                      Username
                      <input
                        className={styles.input}
                        value={form.username}
                        onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                      />
                    </label>
                    <label>
                      รหัสผ่าน (ปล่อยว่างเพื่อไม่เปลี่ยน)
                      <input
                        className={styles.input}
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                      />
                    </label>
                    <label>
                      CID
                      <input
                        className={styles.input}
                        value={form.cid}
                        onChange={(e) => setForm((prev) => ({ ...prev, cid: e.target.value }))}
                      />
                    </label>
                    <label>
                      ชื่อ
                      <input
                        className={styles.input}
                        value={form.fname}
                        onChange={(e) => setForm((prev) => ({ ...prev, fname: e.target.value }))}
                      />
                    </label>
                    <label>
                      นามสกุล
                      <input
                        className={styles.input}
                        value={form.lname}
                        onChange={(e) => setForm((prev) => ({ ...prev, lname: e.target.value }))}
                      />
                    </label>
                    <label>
                      สถานะ
                      <input
                        className={styles.input}
                        value={form.status}
                        onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                      />
                    </label>
                    <label>
                      Access Level
                      <input
                        className={styles.input}
                        type="number"
                        value={form.accessLevel}
                        onChange={(e) => setForm((prev) => ({ ...prev, accessLevel: e.target.value }))}
                      />
                    </label>
                    <label>
                      Mobile
                      <input
                        className={styles.input}
                        value={form.mobile}
                        onChange={(e) => setForm((prev) => ({ ...prev, mobile: e.target.value }))}
                      />
                    </label>
                    <label>
                      Email
                      <input
                        className={styles.input}
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </label>
                  </div>

                  <div className={styles.saveRow}>
                    <button className={styles.primaryBtn} type="button" onClick={submitForm} disabled={formSaving}>
                      {formSaving ? "Saving..." : "Save"}
                    </button>
                    <button className={styles.secondaryBtn} type="button" onClick={closeModal} disabled={formSaving}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

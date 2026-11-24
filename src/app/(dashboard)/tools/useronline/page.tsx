'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

type UserOnlineRow = {
  id: number | null;
  username: string | null;
  logined: string | null;
  ipv4: string | null;
  logindate: string | null;
};

type ApiResult = {
  items: UserOnlineRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};


const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return dt.toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Bangkok",
  });
};

export default function UserOnlineReportPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  // ค่าเดิม 20 ไม่อยู่ใน PAGE_SIZE_OPTIONS (5/10/15/50/100) ตัวเลือกใน select จึงแสดงค่านั้นไม่ได้ → ใช้ 15 ซึ่งใกล้ที่สุด (PRD 11.1)
  const [pageSize, setPageSize] = useState(15);
  useReloadOnPageSizeChange(pageSize, () => void fetchLogs(1, appliedFilters));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    username: "",
    ipv4: "",
    logined: "",
    startDate: "",
    endDate: "",
  });
  // ตัวกรองของการโหลดครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า (Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const fetchLogs = async (targetPage: number, currentFilters: typeof filters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });

      if (currentFilters.username.trim()) params.set("username", currentFilters.username.trim());
      if (currentFilters.ipv4.trim()) params.set("ipv4", currentFilters.ipv4.trim());
      if (currentFilters.logined) params.set("logined", currentFilters.logined);
      if (currentFilters.startDate) params.set("startDate", currentFilters.startDate);
      if (currentFilters.endDate) params.set("endDate", currentFilters.endDate);

      const res = await fetch(`/api/useronline?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดรายงานได้");
        setData(null);
      } else {
        setData(json);
        setAppliedFilters(currentFilters);
        setPage(targetPage);
      }
    } catch (_err) {
      setError("ไม่สามารถโหลดรายงานได้");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPage(1);
      void fetchLogs(1, filters);
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
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/tools/useronline" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <div className="mb-3">
          <h1 className="h4 mb-0">รายงานการใช้งาน (useronline)</h1>
        </div>

        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>บันทึกการเข้าสู่ระบบ</span>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                Displaying {displayRange} of {data?.total ?? 0} records.
              </span>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>#</th>
                  <th>ผู้ใช้</th>
                  <th>ผล</th>
                  <th>IP</th>
                  <th>วันที่/เวลา</th>
                </tr>
                <tr>
                  <th> </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="ค้นหา username"
                      value={filters.username}
                      onChange={setFilterField("username")}
                    />
                  </th>
                  <th>
                    <select className="form-select" value={filters.logined} onChange={setFilterField("logined")}>
                      <option value="">ทั้งหมด</option>
                      <option value="Y">สำเร็จ</option>
                      <option value="N">ไม่สำเร็จ</option>
                    </select>
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="ค้นหา IP"
                      value={filters.ipv4}
                      onChange={setFilterField("ipv4")}
                    />
                  </th>
                  <th>
                    <div className="vstack gap-1">
                      <input
                        className="form-control form-control-sm"
                        type="date"
                        value={filters.startDate}
                        onChange={setFilterField("startDate")}
                        title="วันที่เริ่ม"
                      />
                      <input
                        className="form-control form-control-sm"
                        type="date"
                        value={filters.endDate}
                        onChange={setFilterField("endDate")}
                        title="วันที่สิ้นสุด"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5}>กำลังโหลด...</td>
                  </tr>
                )}
                {!loading && data?.items?.length === 0 && (
                  <tr>
                    <td className="text-center text-secondary p-3" colSpan={5}>
                      ไม่พบข้อมูลการใช้งาน
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.items?.map((row, idx) => (
                    <tr key={row.id ?? `${row.username}-${row.logindate}-${idx}`}>
                      <td>{(page - 1) * pageSize + idx + 1}</td>
                      <td>{row.username || "-"}</td>
                      <td className="text-center">
                        {row.logined === "Y" ? "สำเร็จ" : row.logined === "N" ? "ไม่สำเร็จ" : "-"}
                      </td>
                      <td>{row.ipv4 || "-"}</td>
                      <td>{formatDateTime(row.logindate)}</td>
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
              onPageChange={(p) => fetchLogs(p, appliedFilters)}
              onPageSizeChange={setPageSize}
            />
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

type ReportRow = {
  CID: string;
  NAME: string | null;
  LPOS: string | null;
  STATION: string | null;
  MONTHTHAI: string;
  NAMEMONTH_TH: string | null;
  YEARTHAI: string;
  PAYNAME: string | null;
  INCOME: number;
  OUTCOME: number;
};

type ApiResult = {
  items: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalIncome: number;
  totalOutcome: number;
};

export default function ReportsAllPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<ReportRow | null>(null);
  const [filters, setFilters] = useState({
    cid: "",
    name: "",
    monththai: "",
    yearthai: "",
  });
  // ตัวกรองของการค้นหาครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า
  // (ไม่ใช้ค่าที่พิมพ์ค้างในฟอร์มแต่ยังไม่กดค้นหา — Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [pageSize, setPageSize] = useState(10);
  useReloadOnPageSizeChange(pageSize, () => void fetchData(1, appliedFilters));

  const fetchData = async (targetPage: number, currentFilters: typeof filters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (currentFilters.cid.trim()) params.set("cid", currentFilters.cid.trim());
      if (currentFilters.name.trim()) params.set("name", currentFilters.name.trim());
      if (currentFilters.monththai.trim()) params.set("monththai", currentFilters.monththai.trim());
      if (currentFilters.yearthai.trim()) params.set("yearthai", currentFilters.yearthai.trim());

      const res = await fetch(`/api/reports/all?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดข้อมูลรายงานได้");
        setData(null);
      } else {
        setData(json);
        setAppliedFilters(currentFilters);
        setPage(targetPage);
      }
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลรายงานได้");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchData(1, filters);
  };

  const handleReset = () => {
    const cleared = { cid: "", name: "", monththai: "", yearthai: "" };
    setFilters(cleared);
    setPage(1);
    void fetchData(1, cleared);
  };

  const displayRange = useMemo(() => {
    if (!data || data.total === 0) return "0-0";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, data.total);
    return `${start}-${end}`;
  }, [data, page, pageSize]);


  const onFilterChange =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLSelectElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const formatNumber = (value: number) =>
    Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openDetail = (row: ReportRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailRow(null);
  };

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/reports" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>รายงานทั้งหมด</span>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                แสดง {displayRange} จากทั้งหมด {data?.total ?? 0} รายการ
              </span>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <button type="submit" form="report-filter-form" className="btn btn-primary" disabled={loading}>
                  {loading ? "กำลังค้นหา..." : "ค้นหา"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleReset}
                  disabled={loading}
                >
                  ล้าง
                </button>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <form id="report-filter-form" className="px-3 pt-3 pb-2 border-bottom bg-light" onSubmit={handleSearch}>
            <div className="row g-2 align-items-end">
              <div className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <label htmlFor="cid">CID</label>
                <input
                  id="cid"
                  className="form-control form-control-sm"
                  placeholder="ค้นหา CID"
                  value={filters.cid}
                  onChange={onFilterChange("cid")}
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <label htmlFor="name">ชื่อ-นามสกุล</label>
                <input
                  id="name"
                  className="form-control form-control-sm"
                  placeholder="ค้นหาชื่อ-นามสกุล"
                  value={filters.name}
                  onChange={onFilterChange("name")}
                />
              </div>
              <div className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <label htmlFor="monththai">เดือน</label>
                <select
                  id="monththai"
                  className="form-select form-select-sm"
                  value={filters.monththai}
                  onChange={onFilterChange("monththai")}
                >
                  <option value="">ทุกเดือน</option>
                  <option value="01">มกราคม</option>
                  <option value="02">กุมภาพันธ์</option>
                  <option value="03">มีนาคม</option>
                  <option value="04">เมษายน</option>
                  <option value="05">พฤษภาคม</option>
                  <option value="06">มิถุนายน</option>
                  <option value="07">กรกฎาคม</option>
                  <option value="08">สิงหาคม</option>
                  <option value="09">กันยายน</option>
                  <option value="10">ตุลาคม</option>
                  <option value="11">พฤศจิกายน</option>
                  <option value="12">ธันวาคม</option>
                </select>
              </div>
              <div className="col-12 col-sm-6 col-lg-3 d-flex flex-column gap-1 small fw-semibold mb-0">
                <label htmlFor="yearthai">ปี (YYYY)</label>
                <input
                  id="yearthai"
                  className="form-control form-control-sm"
                  placeholder="YYYY"
                  value={filters.yearthai}
                  onChange={onFilterChange("yearthai")}
                />
              </div>
            </div>
          </form>

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>CID</th>
                  <th>ชื่อ-นามสกุล</th>
                  <th>ตำแหน่ง</th>
                  <th>หน่วยงาน</th>
                  <th>เดือน</th>
                  <th>ปี</th>
                  <th>PAYNAME</th>
                  <th>รายรับ</th>
                  <th>รายจ่าย</th>
                  <th>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row) => (
                  <tr key={`${row.CID}-${row.YEARTHAI}-${row.MONTHTHAI}`}>
                    <td>{row.CID}</td>
                    <td>{row.NAME}</td>
                    <td>{row.LPOS ?? "-"}</td>
                    <td>{row.STATION}</td>
                    <td>{row.NAMEMONTH_TH ?? row.MONTHTHAI}</td>
                    <td>{row.YEARTHAI}</td>
                    <td>{row.PAYNAME ?? "-"}</td>
                    <td className="text-end text-nowrap">{formatNumber(row.INCOME)}</td>
                    <td className="text-end text-nowrap">{formatNumber(row.OUTCOME)}</td>
                    <td className="text-center text-nowrap">
                      <button className="btn btn-link p-0 fw-semibold" type="button" onClick={() => openDetail(row)}>
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={9} className="text-center text-secondary p-3">
                      {loading ? "กำลังโหลดข้อมูล..." : "ไม่พบข้อมูล"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="d-flex flex-wrap justify-content-end gap-4 px-3 py-2 border-top bg-light fw-bold small">
              <div className="d-flex gap-2 align-items-center fw-semibold">
                <span>รวมรายรับ</span>
                <strong>{formatNumber(data.totalIncome)}</strong>
              </div>
              <div className="d-flex gap-2 align-items-center fw-semibold">
                <span>รวมรายจ่าย</span>
                <strong>{formatNumber(data.totalOutcome)}</strong>
              </div>
            </div>
          )}

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

      {detailOpen && detailRow && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"><div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5">รายละเอียดรายการ</h2>
              <button className="btn-close" onClick={closeDetail} aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <table className="table table-sm table-bordered mb-0">
                <tbody>
                  <tr>
                    <th>CID</th>
                    <td>{detailRow.CID}</td>
                  </tr>
                  <tr>
                    <th>ชื่อ-นามสกุล</th>
                    <td>{detailRow.NAME}</td>
                  </tr>
                  <tr>
                    <th>Station</th>
                    <td>{detailRow.STATION}</td>
                  </tr>
                  <tr>
                    <th>ตำแหน่ง</th>
                    <td>{detailRow.LPOS ?? "-"}</td>
                  </tr>
                  <tr>
                    <th>เดือน</th>
                    <td>{detailRow.NAMEMONTH_TH ?? detailRow.MONTHTHAI}</td>
                  </tr>
                  <tr>
                    <th>ปี</th>
                    <td>{detailRow.YEARTHAI}</td>
                  </tr>
                  <tr>
                    <th>PAYNAME</th>
                    <td>{detailRow.PAYNAME}</td>
                  </tr>
                  
                  <tr>
                    <th>รายรับ</th>
                    <td className="text-end text-nowrap">{formatNumber(detailRow.INCOME)}</td>
                  </tr>
                  <tr>
                    <th>รายจ่าย</th>
                    <td className="text-end text-nowrap">{formatNumber(detailRow.OUTCOME)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div></div>
        </div>
      )}

      <AppFooter />
    </div>
  );
}

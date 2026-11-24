'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

const BANGKOK_TIMEZONE = "Asia/Bangkok";

type SalaryRow = {
  ID: number;
  CID: string;
  BANKID: string | null;
  IDPAY: string;
  PAYNAME: string | null;
  PAYTYPE: string | null;
  PNUMBER: string;
  NODEEGAR: string;
  NUM: string;
  MONTHTHAI: string;
  YEARTHAI: string;
  NAMEMONTH_TH: string | null;
  MONEY: number;
  DUPDATE: string | null;
  IDBANK: string | null;
  NAMEBANK: string | null;
};

type ApiResult = {
  officer: {
    cid: string;
    name: string | null;
    position: string | null;
    station: string | null;
  } | null;
  items: SalaryRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type BankRow = {
  id: string;
  CID: string;
  IDBANK: string;
  NAMEBANK: string | null;
};

type CpayOption = {
  IDPAY: string;
  PAYNAME: string | null;
  PAYTYPE: string | null;
};

type MonthOption = {
  ID: string;
  NAMEMONTH_TH: string;
};

type DeegarOption = {
  PNUMBER: string;
  NODEEGAR: string;
};

export default function OfficerSalariesPage() {
  const router = useRouter();
  const params = useParams<{ cid: string }>();
  const cid = Array.isArray(params?.cid) ? params?.cid[0] : params?.cid ?? "";
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    payname: "",
    idpay: "",
    pnumber: "",
    nodeegar: "",
    monththai: "",
    yearthai: "",
  });
  // ตัวกรองของการโหลดครั้งล่าสุดที่สำเร็จ ใช้ตอนเปลี่ยนหน้า/จำนวนต่อหน้า (Codex review งาน #12)
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    cid: "",
    name: "",
    bankId: "",
    monththai: "",
    yearthai: "",
    pnumber: "",
    nodeegar: "1",
    num: "1",
    idpay: "",
    money: "0.00",
  });
  const [paySaving, setPaySaving] = useState(false);
  const [payDeleting, setPayDeleting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [editingSalaryId, setEditingSalaryId] = useState<number | null>(null);
  const [cpayOptions, setCpayOptions] = useState<CpayOption[]>([]);
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [payOptionsLoading, setPayOptionsLoading] = useState(false);
  const [deegarOptions, setDeegarOptions] = useState<DeegarOption[]>([]);
  const [deegarLoading, setDeegarLoading] = useState(false);
  const [payBanks, setPayBanks] = useState<BankRow[]>([]);
  const [payBanksLoading, setPayBanksLoading] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  useReloadOnPageSizeChange(pageSize, () => void fetchData(1, appliedFilters));
  const fetchData = async (
    targetPage: number,
    currentFilters: typeof filters = filters,
  ) => {
    if (!cid) return;
    setLoading(true);
    setError(null);
    try {
      const search = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      if (currentFilters.payname.trim()) search.set("payname", currentFilters.payname.trim());
      if (currentFilters.idpay.trim()) search.set("idpay", currentFilters.idpay.trim());
      if (currentFilters.pnumber.trim()) search.set("pnumber", currentFilters.pnumber.trim());
      if (currentFilters.nodeegar.trim()) search.set("nodeegar", currentFilters.nodeegar.trim());
      if (currentFilters.monththai.trim()) search.set("monththai", currentFilters.monththai.trim());
      if (currentFilters.yearthai.trim()) search.set("yearthai", currentFilters.yearthai.trim());

      const res = await fetch(`/api/officers/${cid}/salaries?${search.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "โหลดข้อมูลรับ-จ่ายไม่สำเร็จ");
        setData(null);
      } else {
        setData(json);
        setAppliedFilters(currentFilters);
        setPage(targetPage);
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!cid) return;
    void fetchData(1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  useEffect(() => {
    if (!cid) return;
    const handle = setTimeout(() => {
      setPage(1);
      void fetchData(1, filters);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, cid]);

  const getDefaultMonthYear = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: BANGKOK_TIMEZONE,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);
    const month = parts.find((part) => part.type === "month")?.value ?? String(now.getMonth() + 1).padStart(2, "0");
    const year = parts.find((part) => part.type === "year")?.value ?? String(now.getFullYear());
    return {
      month,
      yearThai: String(Number(year) + 543),
    };
  };

  const loadPayOptions = async () => {
    if ((cpayOptions.length && monthOptions.length) || payOptionsLoading) return;
    setPayOptionsLoading(true);
    try {
      const [cpayRes, monthRes] = await Promise.all([
        fetch("/api/cpays", { cache: "no-store", credentials: "include" }),
        fetch("/api/cmonths", { cache: "no-store", credentials: "include" }),
      ]);
      const cpayJson = await cpayRes.json();
      if (cpayRes.ok) {
        setCpayOptions(cpayJson.items || cpayJson.stations || []);
      }
      const monthJson = await monthRes.json();
      if (monthRes.ok) {
        setMonthOptions(monthJson.months || []);
      }
    } catch (err) {
      // swallow errors, UI will show defaults
    } finally {
      setPayOptionsLoading(false);
    }
  };

  const loadPayBanks = async (targetCid: string, preferredBankId?: string) => {
    if (!targetCid) return;
    setPayBanksLoading(true);
    setPayBanks([]);
    try {
      const res = await fetch(`/api/banks?cid=${targetCid}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) {
        const list = (json.banks || []).map((b: any) => ({
          id: String(b.id),
          CID: b.CID,
          IDBANK: b.IDBANK,
          NAMEBANK: b.NAMEBANK ?? null,
        }));
        setPayBanks(list);
        setPayForm((f) => {
          const preferred = preferredBankId?.trim() || f.bankId?.trim();
          const hasPreferred = preferred ? list.some((item: BankRow) => item.id === preferred) : false;
          return {
            ...f,
            bankId: hasPreferred ? preferred : list[0]?.id ?? "",
          };
        });
      } else if (json.error) {
        setPayError(json.error);
      }
    } catch (err) {
      // ignore for now; handled by form validation
    } finally {
      setPayBanksLoading(false);
    }
  };

  const loadDeegar = async (query: string) => {
    if (deegarLoading) return;
    setDeegarLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "10",
        pnumberOnly: "1",
      });
      if (query.trim()) params.set("pnumber", query.trim());
      const res = await fetch(`/api/deegars?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) {
        const newItems: DeegarOption[] = (json.items || []).map((item: any) => ({
          PNUMBER: item.PNUMBER,
          NODEEGAR: item.NODEEGAR,
        }));
        setDeegarOptions(newItems);
      }
    } catch (err) {
      // ignore load errors for dropdown
    } finally {
      setDeegarLoading(false);
    }
  };

  useEffect(() => {
    if (!payModal) return;
    const handle = setTimeout(() => {
      void loadDeegar(payForm.pnumber);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payForm.pnumber, payModal]);

  const openPayModal = () => {
    const defaults = getDefaultMonthYear();
    setPayForm({
      cid,
      name: data?.officer?.name ?? "",
      bankId: "",
      monththai: defaults.month,
      yearthai: defaults.yearThai,
      pnumber: "",
      nodeegar: "1",
      num: "1",
      idpay: "",
      money: "0.00",
    });
    setPayError(null);
    setEditingSalaryId(null);
    setPayBanks([]);
    setPayModal(true);
    void loadPayOptions();
    void loadPayBanks(cid);
    setDeegarOptions([]);
    void loadDeegar("");
  };

  const openPayEditModal = (row: SalaryRow) => {
    setPayForm({
      cid: row.CID || cid,
      name: data?.officer?.name ?? "",
      bankId: row.BANKID ?? "",
      monththai: row.MONTHTHAI || "",
      yearthai: row.YEARTHAI || "",
      pnumber: row.PNUMBER || "",
      nodeegar: row.NODEEGAR || "1",
      num: row.NUM || "1",
      idpay: row.IDPAY || "",
      money: String(Number(row.MONEY ?? 0)),
    });
    setPayError(null);
    setEditingSalaryId(row.ID);
    setPayBanks([]);
    setPayModal(true);
    void loadPayOptions();
    void loadPayBanks(row.CID || cid, row.BANKID ?? "");
    setDeegarOptions([]);
    void loadDeegar(row.PNUMBER || "");
  };

  const handlePaySave = async () => {
    const defaults = getDefaultMonthYear();
    const payload = {
      cid: payForm.cid.trim(),
      idpay: payForm.idpay.trim(),
      bankId: payForm.bankId.trim(),
      pnumber: payForm.pnumber.trim() || "P000000000",
      nodeegar: payForm.nodeegar.trim() || "1",
      num: payForm.num.trim() || "1",
      monththai: payForm.monththai.trim() || defaults.month,
      yearthai: payForm.yearthai.trim() || defaults.yearThai,
      money: Number(payForm.money || 0),
    };
    if (!payload.cid || !payload.idpay || Number.isNaN(payload.money)) {
      setPayError("Please fill required fields and enter a valid amount.");
      return;
    }
    if (!payload.bankId) {
      setPayError(
        payBanks.length === 0
          ? "No bank account found for this officer. Please add one first."
          : "Please select a bank account.",
      );
      return;
    }
    setPaySaving(true);
    setPayError(null);
    try {
      const isEdit = editingSalaryId !== null;
      const res = await fetch(isEdit ? `/api/salaries/${editingSalaryId}` : "/api/salaries", {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(json.error || "Could not save salary.");
      } else {
        setPayModal(false);
        setEditingSalaryId(null);
        setPage(1);
        void fetchData(1, filters);
      }
    } catch (err) {
      setPayError("Unexpected error while saving salary.");
    } finally {
      setPaySaving(false);
    }
  };

  const displayRange = useMemo(() => {
    if (!data) return "0-0";
    const start = (page - 1) * (data.pageSize || 10) + 1;
    const end = Math.min(page * (data.pageSize || 10), data.total);
    return `${start}-${end}`;
  }, [data, page]);


  const onFilterChange =
    (field: keyof typeof filters) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));

  const formatMoney = (value: number | null | undefined) =>
    Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: BANGKOK_TIMEZONE,
    });
  };

  const handlePayDelete = async () => {
    if (!editingSalaryId) return;
    const confirmed = window.confirm("ยืนยันลบรายการนี้ใช่หรือไม่?");
    if (!confirmed) return;

    setPayDeleting(true);
    setPayError(null);
    try {
      const res = await fetch(`/api/salaries/${editingSalaryId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(json.error || "Could not delete salary.");
      } else {
        setPayModal(false);
        setEditingSalaryId(null);
        setPage(1);
        void fetchData(1, filters);
      }
    } catch (err) {
      setPayError("Unexpected error while deleting salary.");
    } finally {
      setPayDeleting(false);
    }
  };

  const monthChoices: MonthOption[] =
    monthOptions.length > 0
      ? monthOptions
      : [
          { ID: "01", NAMEMONTH_TH: "มกราคม" },
          { ID: "02", NAMEMONTH_TH: "กุมภาพันธ์" },
          { ID: "03", NAMEMONTH_TH: "มีนาคม" },
          { ID: "04", NAMEMONTH_TH: "เมษายน" },
          { ID: "05", NAMEMONTH_TH: "พฤษภาคม" },
          { ID: "06", NAMEMONTH_TH: "มิถุนายน" },
          { ID: "07", NAMEMONTH_TH: "กรกฎาคม" },
          { ID: "08", NAMEMONTH_TH: "สิงหาคม" },
          { ID: "09", NAMEMONTH_TH: "กันยายน" },
          { ID: "10", NAMEMONTH_TH: "ตุลาคม" },
          { ID: "11", NAMEMONTH_TH: "พฤศจิกายน" },
          { ID: "12", NAMEMONTH_TH: "ธันวาคม" },
        ];

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/officers" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <div className="mb-3">
          <h1 className="h4 mb-0">รายการรับ-จ่าย</h1>
          <p className="small text-secondary mb-0 mt-1">
            ข้อมูลจาก salary สำหรับ {data?.officer?.name ?? "ไม่ระบุชื่อ"} ({cid})
            {data?.officer?.station ? ` | ${data.officer.station}` : ""}
          </p>
        </div>

        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <span>ประวัติรับ-จ่ายเงิน</span>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                แสดง {displayRange} จากทั้งหมด {data?.total ?? 0} รายการ
              </span>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openPayModal}
                disabled={loading || !cid}
              >
                เพิ่ม รายการรับ-จ่าย
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>รหัสรับ-จ่าย</th>
                  <th>รายละเอียด</th>
                  <th>เดือน</th>
                  <th>ปี</th>
                  <th>เลขฎีกา</th>
                  <th>ชุด</th>
                  <th>ครั้งที่</th>
                  <th>จำนวนเงิน</th>
                  <th>บัญชี/ธนาคาร</th>
                  <th>อัปเดตล่าสุด</th>
                  <th>เครื่องมือ</th>
                </tr>
                <tr>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="เช่น 10001"
                      value={filters.idpay}
                      onChange={onFilterChange("idpay")}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="Search detail"
                      value={filters.payname}
                      onChange={onFilterChange("payname")}
                    />
                  </th>
                  <th>
                    <select
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
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="เช่น 2568"
                      value={filters.yearthai}
                      onChange={onFilterChange("yearthai")}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="เลข Pnumber"
                      value={filters.pnumber}
                      onChange={onFilterChange("pnumber")}
                    />
                  </th>
                  <th>
                    <input
                      className="form-control form-control-sm"
                      placeholder="ชุดฎีกา"
                      value={filters.nodeegar}
                      onChange={onFilterChange("nodeegar")}
                    />
                  </th>
                  <th />
                  <th />
                  <th />
                  <th />
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row, idx) => (
                  <tr key={`${row.ID}-${idx}`}>
                    <td>{row.IDPAY}</td>
                    <td>
                      <div className="vstack gap-0">
                        <strong>{row.PAYNAME ?? "-"}</strong>
                        <span className="text-secondary small">
                          {row.PAYTYPE === "1" ? "รายรับ" : "รายจ่าย"}
                        </span>
                      </div>
                    </td>
                    <td>{row.NAMEMONTH_TH ?? row.MONTHTHAI}</td>
                    <td>{row.YEARTHAI}</td>
                    <td>{row.PNUMBER}</td>
                    <td>{row.NODEEGAR}</td>
                    <td>{row.NUM}</td>
                    <td className="text-end text-nowrap fw-semibold">{formatMoney(row.MONEY)}</td>
                    <td>
                      {row.IDBANK ? (
                        <div className="vstack gap-0">
                          <strong>{row.IDBANK}</strong>
                          <span className="text-secondary small">
                            {row.NAMEBANK ?? "-"}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{formatDate(row.DUPDATE)}</td>
                    <td className="text-center text-nowrap">
                      <div className="text-center text-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary mx-1"
                          title="ดูรายละเอียด"
                          onClick={() => alert(`ดูรายละเอียดรหัส ${row.IDPAY}`)}
                        >
                          🔍
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary mx-1"
                          title="แก้ไข"
                          onClick={() => openPayEditModal(row)}
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={10} className="text-center text-secondary p-3">
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

      <AppFooter />

      {payModal && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"><div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5">{editingSalaryId ? "แก้ไขรายการรับ-จ่าย" : "เพิ่มรายการรับ-จ่าย"} {payForm.name ? `: ${payForm.name}` : ""}</h2>
              <button
                className="btn-close"
                onClick={() => {
                  setPayModal(false);
                  setEditingSalaryId(null);
                }}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <p className="small text-secondary mb-2">
                Fields with * are required. {payOptionsLoading ? "กำลังโหลดตัวเลือก..." : ""}
              </p>
              <div className="row row-cols-1 row-cols-md-2 g-3">
                <label>
                  Cid *
                  <input className="form-control" value={payForm.cid} readOnly />
                </label>
                <label>
                  บัญชีธนาคาร *
                  <select
                    className="form-select"
                    value={payForm.bankId}
                    onChange={(e) => setPayForm((f) => ({ ...f, bankId: e.target.value }))}
                    disabled={payBanksLoading || payBanks.length === 0}
                  >
                    <option value="">
                      {payBanksLoading ? "กำลังโหลดบัญชีธนาคาร..." : "เลือกบัญชีธนาคาร"}
                    </option>
                    {payBanks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.IDBANK} {bank.NAMEBANK ? `- ${bank.NAMEBANK}` : ""}
                      </option>
                    ))}
                  </select>
                  {!payBanksLoading && payBanks.length === 0 && (
                    <div className="small text-secondary mt-1">
                      ไม่พบบัญชีธนาคารสำหรับเจ้าหน้าที่รายนี้ กรุณาเพิ่มบัญชีก่อน
                    </div>
                  )}
                </label>
                <label>
                  Monththai *
                  <select
                    className="form-select"
                    value={payForm.monththai}
                    onChange={(e) => setPayForm((f) => ({ ...f, monththai: e.target.value }))}
                  >
                    {monthChoices.map((m) => (
                      <option key={m.ID} value={m.ID}>
                        {m.NAMEMONTH_TH}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Yearthai *
                  <input
                    className="form-control"
                    value={payForm.yearthai}
                    onChange={(e) => setPayForm((f) => ({ ...f, yearthai: e.target.value }))}
                  />
                </label>
                <label>
                  Pnumber
                  <input
                    className="form-control"
                    list="pnumberOptions"
                    placeholder="ค้นหา Pnumber"
                    value={payForm.pnumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      const match = deegarOptions.find((d) => d.PNUMBER === value);
                      setPayForm((f) => ({
                        ...f,
                        pnumber: value,
                        nodeegar: match?.NODEEGAR || f.nodeegar,
                      }));
                    }}
                    onFocus={() => {
                      if (!deegarOptions.length) {
                        void loadDeegar("");
                      }
                    }}
                  />
                  <datalist id="pnumberOptions">
                    {deegarOptions.map((item) => (
                      <option key={`${item.PNUMBER}-${item.NODEEGAR}`} value={item.PNUMBER}>
                        {item.PNUMBER} (ชุดที่ {item.NODEEGAR})
                      </option>
                    ))}
                  </datalist>
                </label>
                <label>
                  Nodeegar *
                  <input
                    className="form-control"
                    value={payForm.nodeegar}
                    onChange={(e) => setPayForm((f) => ({ ...f, nodeegar: e.target.value }))}
                  />
                </label>
                <label>
                  จำนวนใบสำคัญ *
                  <input
                    className="form-control"
                    value={payForm.num}
                    onChange={(e) => setPayForm((f) => ({ ...f, num: e.target.value }))}
                  />
                </label>
                <label>
                  Ipay *
                  <select
                    className="form-select"
                    value={payForm.idpay}
                    onChange={(e) => setPayForm((f) => ({ ...f, idpay: e.target.value }))}
                  >
                    <option value="">เลือกประเภทจ่าย</option>
                    {cpayOptions.map((c) => (
                      <option key={c.IDPAY} value={c.IDPAY}>
                        {c.IDPAY} - {c.PAYNAME ?? ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Money *
                  <input
                    className="form-control"
                    type="number"
                    step="0.01"
                    value={payForm.money}
                    onChange={(e) => setPayForm((f) => ({ ...f, money: e.target.value }))}
                  />
                </label>
              </div>
              {payError && <div className="alert alert-danger py-2 px-3 m-2 small">{payError}</div>}
              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-primary" onClick={handlePaySave} disabled={paySaving}>
                  {paySaving ? "Saving..." : editingSalaryId ? "Update" : "Save"}
                </button>
                {editingSalaryId && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={handlePayDelete}
                    disabled={payDeleting || paySaving}
                  >
                    {payDeleting ? "Deleting..." : "Delete"}
                  </button>
                )}
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => {
                    setPayModal(false);
                    setEditingSalaryId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div></div>
        </div>
      )}
    </div>
  );
}

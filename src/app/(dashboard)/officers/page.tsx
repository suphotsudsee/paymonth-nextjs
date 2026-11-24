'use client';

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";
import { AlignCenter } from "lucide-react";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

type OfficerRow = {
  CID: string;
  IDCOOP: string | null;
  NAME: string | null;
  LPOS: string | null;
  CODE: string | null;
  NAMESTATION: string | null;
};

type ApiResult = {
  items: OfficerRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type OfficerDetail = {
  CID: string;
  IDCOOP: string | null;
  IDMAN: string | null;
  NO: string | null;
  ID: string | null;
  CODE: string | null;
  NAME: string | null;
  SEX: string | null;
  LPOS: string | null;
  DUPDATE: string | null;
  MOBILE: string | null;
  EMAIL: string | null;
  NAMESTATION: string | null;
};

type StationOption = {
  CODE: string;
  NAMESTATION: string | null;
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



const actionIcons = [
  { symbol: "🔍", label: "ดูรายละเอียด" },
  { symbol: "✏️", label: "แก้ไข" },
  { symbol: "🏛️", label: "บัญชีธนาคาร" },

];

export default function OfficersPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<OfficerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create" | null>(null);
  const [form, setForm] = useState<OfficerDetail | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [stations, setStations] = useState<StationOption[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsLoaded, setStationsLoaded] = useState(false);
  const [bankModal, setBankModal] = useState(false);
  const [banks, setBanks] = useState<BankRow[]>([]);
  const [bankForm, setBankForm] = useState<{ id?: string; cid: string; idbank: string; namebank: string }>({
    id: undefined,
    cid: "",
    idbank: "",
    namebank: "",
  });
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankOfficer, setBankOfficer] = useState<{ cid: string; name?: string }>({ cid: "" });
  const [filters, setFilters] = useState({
    cid: "",
    coop: "",
    name: "",
    station: "",
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
  const [payError, setPayError] = useState<string | null>(null);
  const [cpayOptions, setCpayOptions] = useState<CpayOption[]>([]);
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [payOptionsLoading, setPayOptionsLoading] = useState(false);
  const [deegarOptions, setDeegarOptions] = useState<DeegarOption[]>([]);
  const [deegarLoading, setDeegarLoading] = useState(false);
  const [payBanks, setPayBanks] = useState<BankRow[]>([]);
  const [payBanksLoading, setPayBanksLoading] = useState(false);
  const router = useRouter();

  const emptyOfficer: OfficerDetail = {
    CID: "",
    IDCOOP: null,
    IDMAN: null,
    NO: null,
    ID: null,
    CODE: null,
    NAME: null,
    SEX: null,
    LPOS: null,
    DUPDATE: new Date().toISOString().replace("T", " ").slice(0, 19),
    MOBILE: null,
    EMAIL: null,
    NAMESTATION: null,
  };

  const normalizeSexValue = (value: any): string | null => {
    const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
    if (!raw) return null;
    if (raw === "1" || raw === "ชาย") return "1";
    if (raw === "2" || raw === "หญิง") return "2";
    return raw;
  };

  const formatSex = (value: string | null) => {
    if (value === "1") return "ชาย";
    if (value === "2") return "หญิง";
    if (!value) return "-";
    return value;
  };

  const normalizeDupdate = (value: any) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.replace("T", " ").slice(0, 19);
    if (value instanceof Date) return value.toISOString().replace("T", " ").slice(0, 19);
    return String(value);
  };

  const [pageSize, setPageSize] = useState(10);
  useReloadOnPageSizeChange(pageSize, () => void load(1, appliedFilters));

  const load = async (
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

      if (currentFilters.cid.trim()) params.set("cid", currentFilters.cid);
      if (currentFilters.coop.trim()) params.set("coop", currentFilters.coop);
      if (currentFilters.name.trim()) params.set("name", currentFilters.name);
      if (currentFilters.station.trim()) {
        params.set("station", currentFilters.station);
      }

      const res = await fetch(`/api/officers?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "ไม่สามารถโหลดข้อมูลเจ้าหน้าที่ได้");
        setData(null);
      } else {
        setData(json);
        setAppliedFilters(currentFilters);
        setPage(targetPage);
      }
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const deleteBank = async (id: string) => {
    setBankSaving(true);
    setBankError(null);
    try {
      const res = await fetch(`/api/banks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBankError(json.error || "ลบบัญชีไม่สำเร็จ");
      } else {
        const resList = await fetch(`/api/banks?cid=${bankOfficer.cid}`, {
          cache: "no-store",
          credentials: "include",
        });
        const listJson = await resList.json();
        if (resList.ok) {
          const list = (listJson.banks || []).map((b: any) => ({
            id: String(b.id),
            CID: b.CID,
            IDBANK: b.IDBANK,
            NAMEBANK: b.NAMEBANK ?? null,
          }));
          setBanks(list);
        }
        setBankForm({ id: undefined, cid: bankOfficer.cid, idbank: "", namebank: "" });
      }
    } catch (err) {
      setBankError("ลบบัญชีไม่สำเร็จ");
    } finally {
      setBankSaving(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load(1, filters);
    }, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!payModal) return;
    const handle = setTimeout(() => {
      void loadDeegar(payForm.pnumber);
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payForm.pnumber, payModal]);

  const ensureStations = async () => {
    if (stationsLoaded || stationsLoading) return;
    setStationsLoading(true);
    try {
      const res = await fetch("/api/stations", {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (res.ok) {
        setStations(json.stations || []);
        setStationsLoaded(true);
      }
    } catch (err) {
      // ignore load errors for now
    } finally {
      setStationsLoading(false);
    }
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
      // swallow, handled by UI defaults
    } finally {
      setPayOptionsLoading(false);
    }
  };

  const loadPayBanks = async (cid: string) => {
    if (!cid) return;
    setPayBanksLoading(true);
    setPayBanks([]);
    try {
      const res = await fetch(`/api/banks?cid=${cid}`, {
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
        setPayForm((f) => ({
          ...f,
          bankId: list[0]?.id ?? "",
        }));
      } else if (json.error) {
        setPayError(json.error);
      }
    } catch (err) {
      // ignore for now; handled by form validation
    } finally {
      setPayBanksLoading(false);
    }
  };

  const loadDetail = async (cid: string, mode: "view" | "edit" = "view") => {
    setDetailLoading(true);
    setDetailError(null);
    setDetail({
      CID: cid,
      IDCOOP: null,
      IDMAN: null,
      NO: null,
      ID: null,
      CODE: null,
      NAME: null,
      SEX: null,
      LPOS: null,
      DUPDATE: null,
      MOBILE: null,
      EMAIL: null,
      NAMESTATION: null,
    });
    setModalMode(mode);
    if (mode === "edit") {
      void ensureStations();
    }
    try {
      const res = await fetch(`/api/officers/${cid}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setDetailError(json.error || "ไม่พบข้อมูลเจ้าหน้าที่");
        setDetail(null);
        setForm(null);
      } else {
        const normalized = {
          ...json.officer,
          SEX: normalizeSexValue(json.officer?.SEX),
          DUPDATE: normalizeDupdate(json.officer?.DUPDATE),
        };
        setDetail(normalized);
        setForm(normalized);
      }
    } catch (err) {
      setDetailError("โหลดรายละเอียดไม่สำเร็จ");
      setDetail((prev) =>
        prev ?? {
          CID: cid,
          IDCOOP: null,
          IDMAN: null,
          NO: null,
          ID: null,
          CODE: null,
          NAME: null,
          SEX: null,
          LPOS: null,
          DUPDATE: null,
          MOBILE: null,
          EMAIL: null,
          NAMESTATION: null,
        },
      );
      setForm(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form?.CID) return;
    setSaveLoading(true);
    try {
      const isCreate = modalMode === "create";
      const endpoint = isCreate ? "/api/officers" : `/api/officers/${form.CID}`;
      const method = isCreate ? "POST" : "PUT";
      const payload = {
        cid: form.CID,
        idcoop: form.IDCOOP,
        idman: form.IDMAN,
        no: form.NO,
        code: form.CODE,
        id: form.ID,
        name: form.NAME,
        sex: form.SEX,
        lpos: form.LPOS,
        dupdate: form.DUPDATE,
        mobile: form.MOBILE,
        email: form.EMAIL,
      };
      const res = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setDetailError(json.error || "บันทึกไม่สำเร็จ");
      } else {
        setDetail(json.officer || null);
        setForm(json.officer || null);
        await load(1, filters);
        setModalMode("view");
      }
    } catch (err) {
      setDetailError("บันทึกไม่สำเร็จ");
    } finally {
      setSaveLoading(false);
    }
  };

  const openCreateModal = () => {
    void ensureStations();
    setDetail(null);
    setForm(emptyOfficer);
    setDetailError(null);
    setModalMode("create");
  };

  const openBankModal = async (row: OfficerRow) => {
    setBankModal(true);
    setBankOfficer({ cid: row.CID, name: row.NAME || "" });
    setBankForm({ id: undefined, cid: row.CID, idbank: "", namebank: "" });
    setBankError(null);
    setBanks([]);
    setBankLoading(true);
    try {
      const res = await fetch(`/api/banks?cid=${row.CID}`, {
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
        setBanks(list);
        if (list[0]) {
          setBankForm({
            id: list[0].id,
            cid: list[0].CID,
            idbank: list[0].IDBANK,
            namebank: list[0].NAMEBANK ?? "",
          });
        }
      } else {
        setBankError(json.error || "โหลดข้อมูลบัญชีไม่สำเร็จ");
      }
    } catch (err) {
      setBankError("โหลดข้อมูลบัญชีไม่สำเร็จ");
    } finally {
      setBankLoading(false);
    }
  };

  const saveBank = async () => {
    if (!bankForm.cid || !bankForm.idbank) {
      setBankError("กรอกข้อมูลให้ครบก่อนบันทึก");
      return;
    }
    setBankSaving(true);
    setBankError(null);
    try {
      const endpoint = bankForm.id ? `/api/banks/${bankForm.id}` : "/api/banks";
      const method = bankForm.id ? "PUT" : "POST";
      const res = await fetch(endpoint, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm),
      });
      const json = await res.json();
      if (!res.ok) {
        setBankError(json.error || "บันทึกบัญชีไม่สำเร็จ");
      } else {
        const resList = await fetch(`/api/banks?cid=${bankForm.cid}`, {
          cache: "no-store",
          credentials: "include",
        });
        const listJson = await resList.json();
        if (resList.ok) {
          const list = (listJson.banks || []).map((b: any) => ({
            id: String(b.id),
            CID: b.CID,
            IDBANK: b.IDBANK,
            NAMEBANK: b.NAMEBANK ?? null,
          }));
          setBanks(list);
        }
        setBankForm((f) => ({
          id: undefined,
          cid: f.cid,
          idbank: "",
          namebank: "",
        }));
      }
    } catch (err) {
      setBankError("บันทึกบัญชีไม่สำเร็จ");
    } finally {
      setBankSaving(false);
    }
  };

  const getDefaultMonthYear = () => {
    const now = new Date();
    return {
      month: String(now.getMonth() + 1).padStart(2, "0"),
      yearThai: String(now.getFullYear() + 543),
    };
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
      setPayError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (!payload.bankId) {
      setPayError(
        payBanks.length === 0
          ? "ยังไม่มีบัญชีธนาคารของเจ้าหน้าที่ โปรดเพิ่มบัญชีก่อน"
          : "กรุณาเลือกบัญชีธนาคาร",
      );
      return;
    }
    setPaySaving(true);
    setPayError(null);
    try {
      const res = await fetch("/api/salaries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPayError(json.error || "บันทึกข้อมูลรับ-จ่ายไม่สำเร็จ");
      } else {
        setPayModal(false);
      }
    } catch (err) {
      setPayError("บันทึกข้อมูลรับ-จ่ายไม่สำเร็จ");
    } finally {
      setPaySaving(false);
    }
  };

  const loadDeegar = async (query: string) => {
    if (deegarLoading) return;
    setDeegarLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "10",
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

  const formatMoney = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "-";
    const cleaned = typeof value === "string" ? value.replace(/,/g, "").trim() : value;
    const num = typeof cleaned === "number" ? cleaned : Number(cleaned);
    if (!Number.isFinite(num)) return String(value);

    const amountInBaht = num / 100; // paydirect amounts are stored in satang
    return amountInBaht.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const openSalaryList = (row: OfficerRow) => {
    router.push(`/officers/${row.CID}/salaries`);
  };

  const openPayDirect = (row: OfficerRow) => {
    router.push(`/officers/${row.CID}/paydirect`);
  };

  const openPersonal = (row: OfficerRow) => {
    router.push(`/officers/${row.CID}/payperson`);
  };

  const displayRange = useMemo(() => {
    if (!data) return "0-0";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, data.total);
    return `${start}-${end}`;
  }, [data, page, pageSize]);
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
        <div>
          <section className="card shadow-sm mb-3 overflow-hidden">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
              <span>รายชื่อเจ้าหน้าที่</span>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <span className="small text-secondary fw-semibold">
                  Displaying {displayRange} of {data?.total ?? 0} results.
                </span>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={openCreateModal}
                >
                  + เพิ่มเจ้าหน้าที่
                </button>
              </div>
            </div>

            {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
                <thead className="table-light">
                  <tr className="text-center">
                    <th>เลขบัตรประชาชน</th>
                    <th>สหกรณ์</th>
                    <th>ชื่อ-นามสกุล</th>
                    <th>ปฏิบัติงานที่</th>
                    <th className="text-center text-nowrap">เครื่องมือ</th>
                    <th className="text-center">รายการรับ-จ่าย</th>
                   
                    <th className="text-center">ส่วนบุคคล</th>
                    <th className="text-center">จ่ายตรง</th>
                  </tr>
                  <tr>
                    <th>
                      <input
                        className="form-control form-control-sm"
                        value={filters.cid}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, cid: e.target.value }))
                        }
                        placeholder="ค้นหาเลขบัตร"
                      />
                    </th>
                    <th>
                      <input
                        className="form-control form-control-sm"
                        value={filters.coop}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, coop: e.target.value }))
                        }
                        placeholder="ค้นหาสหกรณ์"
                      />
                    </th>
                    <th>
                      <input
                        className="form-control form-control-sm"
                        value={filters.name}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="ค้นหาชื่อ"
                      />
                    </th>
                    <th>
                      <input
                        className="form-control form-control-sm"
                        value={filters.station}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, station: e.target.value }))
                        }
                        placeholder="เลือกพื้นที่"
                      />
                    </th>
                    <th />
                 
                    <th />
                    <th />
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data?.items?.map((row, idx) => (
                    <tr key={`${row.CID}-${idx}`}>
                      <td>{row.CID}</td>
                      <td>{row.IDCOOP ?? "-"}</td>
                      <td>{row.NAME ?? "-"}</td>
                      <td>{row.NAMESTATION ?? row.LPOS ?? "-"}</td>
                      <td className="text-center text-nowrap">
                        {actionIcons.map((icon, iconIdx) => (
                          <button
                            key={icon.label}
                            className="btn btn-sm btn-outline-primary mx-1"
                            type="button"
                            aria-label={icon.label}
                            title={icon.label}
                            disabled={loading}
                            onClick={
                              iconIdx === 0
                                ? () => {
                                    void loadDetail(row.CID, "view");
                                  }
                                : iconIdx === 1
                                  ? () => {
                                      void loadDetail(row.CID, "edit");
                                    }
                                  : iconIdx === 2
                                    ? () => {
                                        setModalMode(null);
                                        setDetail(null);
                                        void openBankModal(row);
                                    }
                                : undefined
                            }
                          >
                            {icon.symbol}
                          </button>
                        ))}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary text-nowrap"
                          onClick={() => openSalaryList(row)}
                          disabled={loading}
                        >
                          รายการรับ-จ่ายเงิน
                        </button>
                      </td>
       
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary text-nowrap"
                          onClick={() => openPersonal(row)}
                          disabled={loading}
                        >
                          ส่วนบุคคล
                        </button>
                      </td>                         
                      <td className="text-center">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary text-nowrap"
                          onClick={() => openPayDirect(row)}
                          disabled={loading}
                        >
                          จ่ายตรง
                        </button>
                      </td>                      
                    </tr>
                  ))}

                  {!data?.items?.length && (
                    <tr>
                      <td colSpan={6} className="text-center text-secondary p-3">
                        {loading ? "กำลังโหลดข้อมูล..." : "ไม่มีข้อมูล"}
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
                onPageChange={(p) => load(p, appliedFilters)}
                onPageSizeChange={setPageSize}
              />
            )}
          </section>

        </div>
      </main>

      <AppFooter />

      {modalMode && (detail || modalMode === "create") && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"><div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5">
                {modalMode === "view"
                  ? "View Officer"
                  : modalMode === "edit"
                    ? "Update Officer"
                    : "Create Officer"}{" "}
                {detail?.NAME || form?.NAME || ""} {detail?.CID || form?.CID || ""}
              </h2>
              <button
                className="btn-close"
                onClick={() => {
                  setModalMode(null);
                  setDetail(null);
                  setForm(null);
                  setDetailError(null);
                }}
                aria-label="Close"
              ></button>
            </div>
            {detailLoading && <div className="modal-body">กำลังโหลด...</div>}
            {detailError && (
              <div className="modal-body text-danger">
                {detailError}
              </div>
            )}
            {!detailLoading && !detailError && modalMode === "view" && detail && (
              <div className="modal-body">
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">CID</span>
                  <strong className="col">{detail.CID}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Idcoop</span>
                  <strong className="col">{detail.IDCOOP ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Idman</span>
                  <strong className="col">{detail.IDMAN ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">No</span>
                  <strong className="col">{detail.NO ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Code</span>
                  <strong className="col">{detail.CODE ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Name</span>
                  <strong className="col">{detail.NAME ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Sex</span>
                  <strong className="col">{formatSex(detail.SEX)}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Lpos</span>
                  <strong className="col">{detail.LPOS ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Station</span>
                  <strong className="col">{detail.NAMESTATION ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Dupdate</span>
                  <strong className="col">{detail.DUPDATE ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Mobile</span>
                  <strong className="col">{detail.MOBILE ?? "-"}</strong>
                </div>
                <div className="row mx-0 py-2 border-bottom small">
                  <span className="col-5 col-sm-4 text-secondary">Email</span>
                  <strong className="col">{detail.EMAIL ?? "-"}</strong>
                </div>
              </div>
            )}
            {!detailLoading &&
              !detailError &&
              (modalMode === "edit" || modalMode === "create") &&
              form && (
              <div className="modal-body">
                <div className="row row-cols-1 row-cols-md-2 g-3">
                  <label>
                    CID *
                    <input
                      className="form-control"
                      value={form.CID}
                      disabled={modalMode !== "create"}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, CID: e.target.value } : f))
                      }
                    />
                  </label>
                  <label>
                    Idcoop
                    <input
                      className="form-control"
                      value={form.IDCOOP ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, IDCOOP: e.target.value } : f))
                      }
                    />
                  </label>
                  <label>
                    Idman
                    <input
                      className="form-control"
                      value={form.IDMAN ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, IDMAN: e.target.value } : f))
                      }
                    />
                  </label>
                  <label>
                    No
                    <input
                      className="form-control"
                      value={form.NO ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, NO: e.target.value } : f))
                      }
                    />
                  </label>
                  <label>
                    Code
                    <select
                      className="form-select"
                      value={form.CODE ?? ""}
                      onChange={(e) => {
                        const code = e.target.value;
                        const station = stations.find((s) => s.CODE === code);
                        setForm((f) =>
                          f
                            ? {
                                ...f,
                                CODE: code || null,
                                NAMESTATION: station?.NAMESTATION ?? null,
                              }
                            : f,
                        );
                      }}
                    >
                      <option value="">เลือกหน่วยงาน</option>
                      {stations.map((s) => (
                        <option key={s.CODE} value={s.CODE}>
                          {s.CODE} - {s.NAMESTATION ?? ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Name
                    <input
                      className="form-control"
                      value={form.NAME ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, NAME: e.target.value } : f))
                      }
                    />
                  </label>
                                    <label>
                    Sex
                    <select
                      className="form-select"
                      value={form.SEX ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, SEX: e.target.value } : f))
                      }
                    >
                      <option value="">เลือกเพศ</option>
                      <option value="1">ชาย</option>
                      <option value="2">หญิง</option>
                    </select>
                  </label>
                  <label>
                    Lpos
                    <input
                      className="form-control"
                      value={form.LPOS ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, LPOS: e.target.value } : f))
                      }
                    />
                  </label>
                  <label>
                    Dupdate
                    <input
                      className="form-control"
                      value={form.DUPDATE ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, DUPDATE: e.target.value } : f))
                      }
                    />
                  </label>
                  <label>
                    Mobile
                    <input
                      className="form-control"
                      value={form.MOBILE ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, MOBILE: e.target.value } : f))
                      }
                    />
                  </label>
                  <label>
                    Email
                    <input
                      className="form-control"
                      value={form.EMAIL ?? ""}
                      onChange={(e) =>
                        setForm((f) => (f ? { ...f, EMAIL: e.target.value } : f))
                      }
                    />
                  </label>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saveLoading}
                  >
                    {saveLoading ? "Saving..." : "Save"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setModalMode(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div></div>
        </div>
      )}

      {bankModal && (
        <div className="modal d-block" tabIndex={-1} role="dialog" aria-modal="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable modal-fullscreen-sm-down"><div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title fs-5">
                Manage Banks {bankOfficer.name ? bankOfficer.name : ""}{" "}
                {bankOfficer.cid}
              </h2>
              <button
                className="btn-close"
                onClick={() => {
                  setBankModal(false);
                  setBankError(null);
                }}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              {bankError && (
                <div className="alert alert-danger py-2 mb-2 small">{bankError}</div>
              )}
              <div className="row row-cols-1 row-cols-md-3 g-2 mt-1">
                <label>
                  CID
                  <input className="form-control" value={bankForm.cid} disabled />
                </label>
                <label>
                  Idbank
                  <input
                    className="form-control"
                    value={bankForm.idbank}
                    onChange={(e) =>
                      setBankForm((f) => ({ ...f, idbank: e.target.value }))
                    }
                  />
                </label>
                <label>
                  Namebank
                  <input
                    className="form-control"
                    value={bankForm.namebank}
                    onChange={(e) =>
                      setBankForm((f) => ({ ...f, namebank: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-primary"
                  onClick={saveBank}
                  disabled={bankSaving}
                >
                  {bankSaving ? "Saving..." : "Save"}
                </button>
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() =>
                    setBankForm({ id: undefined, cid: bankOfficer.cid, idbank: "", namebank: "" })
                  }
                >
                  New
                </button>
              </div>

              <div className="table-responsive mt-3 border rounded">
                <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
                  <span className="fw-bold">บัญชีธนาคาร</span>
                  <span className="small text-secondary">
                    Displaying {banks.length} result{banks.length === 1 ? "" : "s"}.
                  </span>
                </div>
                <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
                  <thead className="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Cid</th>
                      <th>Idbank</th>
                      <th>Namebank</th>
                      <th>เครื่องมือ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankLoading && (
                      <tr>
                        <td colSpan={5} className="text-center text-secondary p-3">
                          กำลังโหลด...
                        </td>
                      </tr>
                    )}
                    {!bankLoading && banks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-secondary p-3">
                          ยังไม่มีบัญชีธนาคาร
                        </td>
                      </tr>
                    )}
                    {banks.map((b) => (
                      <tr key={b.id}>
                        <td>{b.id}</td>
                        <td>{b.CID}</td>
                        <td>{b.IDBANK}</td>
                        <td>{b.NAMEBANK ?? "-"}</td>
                        <td className="text-center text-nowrap">
                          <button
                            className="btn btn-sm btn-outline-primary mx-1"
                            onClick={() =>
                              setBankForm({
                                id: b.id,
                                cid: b.CID,
                                idbank: b.IDBANK,
                                namebank: b.NAMEBANK ?? "",
                              })
                            }
                            type="button"
                            aria-label="แก้ไขบัญชี"
                            title="แก้ไขบัญชี"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary mx-1"
                            onClick={() => deleteBank(b.id)}
                            type="button"
                            aria-label="ลบบัญชี"
                            title="ลบบัญชี"
                            disabled={bankSaving}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div></div>
        </div>
      )}
    </div>
  );
}

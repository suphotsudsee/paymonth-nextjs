'use client';

import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

type DeegarRow = {
  PNUMBER: string;
  NODEEGAR: string;
  ACCNUMBER: string | null;
  ACCNAME: string | null;
  TAX: number | null;
  PAY: number | null;
  MONEY: number | null;
  CHEQUE: string | null;
  PAYDATE: string | null;
};

type ApiResult = {
  items: DeegarRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type DeegarDetail = DeegarRow & {
  ID: number;
};

const PNUMBER_MAX_LENGTH = 10;
const CHEQUE_MAX_LENGTH = 11;

export default function DeegarPage() {
  const [data, setData] = useState<ApiResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editKeys, setEditKeys] = useState<{ pnumber: string; nodeegar: string } | null>(null);
  const [createForm, setCreateForm] = useState({
    pnumber: "",
    nodeegar: "1",
    accnumber: "",
    accname: "",
    tax: "0.00",
    pay: "0.00",
    money: "0.00",
    cheque: "",
  });
  const [filters, setFilters] = useState({
    pnumber: "",
    nodeegar: "",
    accnumber: "",
    accname: "",
    tax: "",
    pay: "",
    money: "",
    paydate: "",
    cheque: "",
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DeegarDetail | null>(null);
  const [chequeOptions, setChequeOptions] = useState<string[]>([]);
  const [chequeQuery, setChequeQuery] = useState("");
  const [pnumberOptions, setPnumberOptions] = useState<string[]>([]);
  const [pnumberQuery, setPnumberQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "PNUMBER" | "NODEEGAR" | "ACCNUMBER" | "ACCNAME" | "PAYDATE" | "CHEQUE"
  >("PNUMBER");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const modalOpen = modalMode !== null;
  const isEditMode = modalMode === "edit";

  const pageSize = 10;

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

      if (currentFilters.pnumber.trim()) params.set("pnumber", currentFilters.pnumber.trim());
      if (currentFilters.nodeegar.trim()) params.set("nodeegar", currentFilters.nodeegar.trim());
      if (currentFilters.accnumber.trim()) params.set("accnumber", currentFilters.accnumber.trim());
      if (currentFilters.accname.trim()) params.set("accname", currentFilters.accname.trim());
      if (currentFilters.cheque.trim()) params.set("cheque", currentFilters.cheque.trim());
      if (currentFilters.tax.trim()) params.set("tax", currentFilters.tax.trim());
      if (currentFilters.pay.trim()) params.set("pay", currentFilters.pay.trim());
      if (currentFilters.money.trim()) params.set("money", currentFilters.money.trim());
      if (currentFilters.paydate.trim()) params.set("paydate", currentFilters.paydate.trim());
      if (currentSortBy) params.set("sortBy", currentSortBy);
      params.set("sortDir", currentSortDir);

      const res = await fetch(`/api/deegars?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเนเธกเนเธชเธณเน€เธฃเนเธ");
        setData(null);
      } else {
        setData(json);
        setPage(targetPage);
      }
    } catch (err) {
      setError("เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เน€เธเธทเนเธญเธกเธ•เนเธญเน€เธเธดเธฃเนเธเน€เธงเธญเธฃเนเนเธ”เน");
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
      void loadChequeOptions(chequeQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [chequeQuery]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadPnumberOptions(pnumberQuery);
    }, 250);
    return () => clearTimeout(handle);
  }, [pnumberQuery]);

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

  const onPnumberFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, pnumber: value }));
    setPnumberQuery(value);
  };

  const onChequeFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters((prev) => ({ ...prev, cheque: value }));
    setChequeQuery(value);
  };

  const onCreateChange =
    (field: keyof typeof createForm) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setCreateForm((prev) => ({ ...prev, [field]: e.target.value }));

  const onPnumberCreateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCreateForm((prev) => ({ ...prev, pnumber: value }));
    setPnumberQuery(value);
  };

  const onChequeCreateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCreateForm((prev) => ({ ...prev, cheque: value }));
    setChequeQuery(value);
  };

  const applySort = (field: "PNUMBER" | "NODEEGAR" | "ACCNUMBER" | "ACCNAME" | "PAYDATE" | "CHEQUE") => {
    setSortBy((prev) => {
      if (prev === field) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return field;
    });
  };

  const openCreate = () => {
    setCreateForm({
      pnumber: "",
      nodeegar: "1",
      accnumber: "",
      accname: "",
      tax: "0.00",
      pay: "0.00",
      money: "0.00",
      cheque: "",
    });
    setEditKeys(null);
    setFormError(null);
    setModalMode("create");
  };

  const openEdit = async (row: DeegarRow) => {
    setModalMode("edit");
    setEditKeys({ pnumber: row.PNUMBER, nodeegar: row.NODEEGAR });
    setFormError(null);
    setModalLoading(true);
    try {
      const res = await fetch(`/api/deegars/${row.PNUMBER}/${row.NODEEGAR}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธ—เธฐเน€เธเธตเธขเธเธเธตเธเธฒเนเธ”เน");
      } else {
        const item = json.item as DeegarDetail;
        setCreateForm({
          pnumber: item.PNUMBER ?? "",
          nodeegar: item.NODEEGAR ?? "1",
          accnumber: item.ACCNUMBER ?? "",
          accname: item.ACCNAME ?? "",
          tax: String(item.TAX ?? "0.00"),
          pay: String(item.PAY ?? "0.00"),
          money: String(item.MONEY ?? "0.00"),
          cheque: item.CHEQUE ?? "",
        });
      }
    } catch (err) {
      setFormError("เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเนเธซเธฅเธ”เธเนเธญเธกเธนเธฅ");
    } finally {
      setModalLoading(false);
    }
  };

  const submitCreate = async () => {
    if (!modalMode) return;
    setFormSaving(true);
    setFormError(null);
    try {
      const payload = {
        pnumber: createForm.pnumber.trim(),
        nodeegar: createForm.nodeegar.trim() || "1",
        accnumber: createForm.accnumber.trim(),
        accname: createForm.accname.trim(),
        tax: Number(createForm.tax || 0),
        pay: Number(createForm.pay || 0),
        money: Number(createForm.money || 0),
        cheque: createForm.cheque.trim() || null,
      };

      const isEdit = modalMode === "edit";
      const endpoint = isEdit
        ? `/api/deegars/${editKeys?.pnumber ?? payload.pnumber}/${editKeys?.nodeegar ?? payload.nodeegar}`
        : "/api/deegars";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(json.error || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธเธฑเธเธ—เธถเธเธ—เธฐเน€เธเธตเธขเธเธเธตเธเธฒเนเธ”เน");
      } else {
        setModalMode(null);
        setCreateForm({
          pnumber: "",
          nodeegar: "1",
          accnumber: "",
          accname: "",
          tax: "0.00",
          pay: "0.00",
          money: "0.00",
          cheque: "",
        });
        await fetchData(1, filters);
      }
    } catch (err) {
      setFormError("เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเธเธฑเธเธ—เธถเธ");
    } finally {
      setFormSaving(false);
    }
  };

  const openDetail = async (row: DeegarRow) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/deegars/${row.PNUMBER}/${row.NODEEGAR}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setDetailError(json.error || "เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เนเธซเธฅเธ”เธเนเธญเธกเธนเธฅเธ—เธฐเน€เธเธตเธขเธเธเธตเธเธฒเนเธ”เน");
      } else {
        setDetail(json.item);
      }
    } catch (err) {
      setDetailError("เน€เธเธดเธ”เธเนเธญเธเธดเธ”เธเธฅเธฒเธ”เนเธเธเธฒเธฃเนเธซเธฅเธ”เธเนเธญเธกเธนเธฅ");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatMoney = (value: number | null | undefined) =>
    Number(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
  };

  return (
    <div className={styles.page}>
      <AppHeader activePath="/deegars" />

      <main className={styles.main}>
        <section className={styles.tableCard}>
          <div className={styles.tableHeadRow}>
            <span>เธ—เธฐเน€เธเธตเธขเธเธเธตเธเธฒ</span>
            <div className={styles.tableHeadActions}>
              <span className={styles.resultText}>
                เนเธชเธ”เธ {displayRange} เธเธฒเธเธ—เธฑเนเธเธซเธกเธ” {data?.total ?? 0} เธฃเธฒเธขเธเธฒเธฃ
              </span>
              <button type="button" className={styles.createBtn} onClick={openCreate}>
                + เน€เธเธดเนเธกเธ—เธฐเน€เธเธตเธขเธเธเธตเธเธฒ
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className={`${styles.sortBtn} ${sortBy === "PNUMBER" ? styles.sortActive : ""}`}
                      onClick={() => applySort("PNUMBER")}
                    >
                      Pnumber
                      {sortBy === "PNUMBER" && <span className={styles.sortLabel}>{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className={`${styles.sortBtn} ${sortBy === "NODEEGAR" ? styles.sortActive : ""}`}
                      onClick={() => applySort("NODEEGAR")}
                    >
                      Nodeegar
                      {sortBy === "NODEEGAR" && <span className={styles.sortLabel}>{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className={`${styles.sortBtn} ${sortBy === "ACCNUMBER" ? styles.sortActive : ""}`}
                      onClick={() => applySort("ACCNUMBER")}
                    >
                      เน€เธฅเธเธเธฑเธเธเธต
                      {sortBy === "ACCNUMBER" && <span className={styles.sortLabel}>{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className={`${styles.sortBtn} ${sortBy === "ACCNAME" ? styles.sortActive : ""}`}
                      onClick={() => applySort("ACCNAME")}
                    >
                      เธเธทเนเธญเธเธฑเธเธเธต
                      {sortBy === "ACCNAME" && <span className={styles.sortLabel}>{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>เธ เธฒเธฉเธต</th>
                  <th>เธเนเธฒเธเธฃเธฑเธ</th>
                  <th>Money</th>
                  <th>
                    <button
                      type="button"
                      className={`${styles.sortBtn} ${sortBy === "PAYDATE" ? styles.sortActive : ""}`}
                      onClick={() => applySort("PAYDATE")}
                    >
                      วันที่จ่าย
                      {sortBy === "PAYDATE" && <span className={styles.sortLabel}>{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className={`${styles.sortBtn} ${sortBy === "CHEQUE" ? styles.sortActive : ""}`}
                      onClick={() => applySort("CHEQUE")}
                    >
                      เน€เธฅเธเธ—เธตเนเน€เธเนเธ
                      {sortBy === "CHEQUE" && <span className={styles.sortLabel}>{sortDir.toUpperCase()}</span>}
                    </button>
                  </th>
                  <th>เน€เธเธฃเธทเนเธญเธเธกเธทเธญ</th>
                </tr>
                <tr className={styles.filterRow}>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="เธเนเธเธซเธฒ Pnumber"
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
                      className={styles.filterInput}
                      placeholder="เธเนเธเธซเธฒ Nodeegar"
                      value={filters.nodeegar}
                      onChange={onFilterChange("nodeegar")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="เน€เธฅเธเธเธฑเธเธเธต"
                      value={filters.accnumber}
                      onChange={onFilterChange("accnumber")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="เธเธทเนเธญเธเธฑเธเธเธต"
                      value={filters.accname}
                      onChange={onFilterChange("accname")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="เธ เธฒเธฉเธต"
                      value={filters.tax}
                      onChange={onFilterChange("tax")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="เธเนเธฒเธเธฃเธฑเธ"
                      value={filters.pay}
                      onChange={onFilterChange("pay")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="เธขเธญเธ”เน€เธเธดเธ"
                      value={filters.money}
                      onChange={onFilterChange("money")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      type="date"
                      value={filters.paydate}
                      onChange={onFilterChange("paydate")}
                    />
                  </th>
                  <th>
                    <input
                      className={styles.filterInput}
                      placeholder="เน€เธฅเธเธ—เธตเนเน€เธเนเธ"
                      maxLength={CHEQUE_MAX_LENGTH}
                      list="chequeOptions"
                      value={filters.cheque}
                      onChange={onChequeFilterChange}
                      onFocus={(e) => {
                        void loadChequeOptions(e.currentTarget.value);
                      }}
                    />
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data?.items?.map((row, idx) => (
                  <tr key={`${row.PNUMBER}-${row.NODEEGAR}-${idx}`}>
                    <td>{row.PNUMBER}</td>
                    <td>{row.NODEEGAR}</td>
                    <td>{row.ACCNUMBER ?? "-"}</td>
                    <td>{row.ACCNAME ?? "-"}</td>
                    <td className={styles.numberCell}>{row.TAX?.toLocaleString() ?? "0.00"}</td>
                    <td className={styles.numberCell}>{row.PAY?.toLocaleString() ?? "0.00"}</td>
                    <td className={styles.moneyCell}>{formatMoney(row.MONEY)}</td>
                    <td className={styles.numberCell}>{formatDate(row.PAYDATE)}</td>
                    <td className={styles.chequeCell}>{row.CHEQUE ?? "-"}</td>
                    <td className={styles.actionsCell}>
                      <button
                        className={styles.iconBtn}
                        title="เธ”เธนเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”"
                        type="button"
                        onClick={() => openDetail(row)}
                      >
                        ๐”
                      </button>
                      <button
                        className={styles.iconBtn}
                        title="เนเธเนเนเธ"
                        type="button"
                        onClick={() => openEdit(row)}
                      >
                        โ๏ธ
                      </button>
                    </td>
                  </tr>
                ))}
                {!data?.items?.length && (
                  <tr>
                    <td colSpan={10} className={styles.emptyState}>
                      {loading ? "เธเธณเธฅเธฑเธเนเธซเธฅเธ”..." : "เนเธกเนเธเธเธเนเธญเธกเธนเธฅ"}
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
                &lt; เธเนเธญเธเธซเธเนเธฒ
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
                เธ–เธฑเธ”เนเธ &gt;
              </button>
            </div>
          )}
        </section>
      </main>

      {modalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>
                {isEditMode ? `Update Deegar ${createForm.pnumber}` : "Create Deegar"}
              </h2>
              <button className={styles.modalClose} onClick={() => setModalMode(null)} aria-label="Close">
                โ•
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalHint}>
                Fields with * are required. {modalLoading ? "เธเธณเธฅเธฑเธเนเธซเธฅเธ”..." : ""}
              </p>
              <div className={styles.formGrid}>
                <label>
                  Pnumber *
                  <input
                    className={styles.input}
                    maxLength={PNUMBER_MAX_LENGTH}
                    value={createForm.pnumber}
                    list="pnumberOptions"
                    onChange={onPnumberCreateChange}
                    onFocus={(e) => {
                      void loadPnumberOptions(e.currentTarget.value);
                    }}
                  />
                </label>
                <label>
                  Nodeegar *
                  <input className={styles.input} value={createForm.nodeegar} onChange={onCreateChange("nodeegar")} />
                </label>
                <label>
                  Accnumber *
                  <input className={styles.input} value={createForm.accnumber} onChange={onCreateChange("accnumber")} />
                </label>
                <label>
                  Accname *
                  <input className={styles.input} value={createForm.accname} onChange={onCreateChange("accname")} />
                </label>
                <label>
                  เธ เธฒเธฉเธต
                  <input className={styles.input} value={createForm.tax} onChange={onCreateChange("tax")} />
                </label>
                <label>
                  เธเนเธฒเธเธฃเธฑเธ
                  <input className={styles.input} value={createForm.pay} onChange={onCreateChange("pay")} />
                </label>
                <label>
                  Money *
                  <input className={styles.input} value={createForm.money} onChange={onCreateChange("money")} />
                </label>
                <label>
                  เน€เธฅเธเธ—เธตเนเน€เธเนเธ
                  <input
                    className={styles.input}
                    maxLength={CHEQUE_MAX_LENGTH}
                    list="chequeOptions"
                    value={createForm.cheque}
                    onChange={onChequeCreateChange}
                    onFocus={(e) => {
                      void loadChequeOptions(e.currentTarget.value);
                    }}
                  />
                </label>
              </div>
              {formError && <div className={styles.error}>{formError}</div>}
              <div className={styles.saveRow}>
                <button className={styles.primaryBtn} onClick={submitCreate} disabled={formSaving || modalLoading}>
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
              <h2>
                View Deegar {detail?.PNUMBER && detail?.NODEEGAR ? `${detail.PNUMBER}/${detail.NODEEGAR}` : ""}
              </h2>
              <button className={styles.modalClose} onClick={() => setDetailOpen(false)} aria-label="Close">
                โ•
              </button>
            </div>
            <div className={styles.modalBody}>
              {detailLoading && <p className={styles.modalHint}>เธเธณเธฅเธฑเธเนเธซเธฅเธ”...</p>}
              {detailError && <div className={styles.error}>{detailError}</div>}
              {detail && (
                <table className={styles.detailTable}>
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
                      <th>Nodeegar</th>
                      <td>{detail.NODEEGAR}</td>
                    </tr>
                    <tr>
                      <th>Accnumber</th>
                      <td>{detail.ACCNUMBER}</td>
                    </tr>
                    <tr>
                      <th>Accname</th>
                      <td>{detail.ACCNAME}</td>
                    </tr>
                    <tr>
                      <th>เธ เธฒเธฉเธต</th>
                      <td>{detail.TAX ?? 0}</td>
                    </tr>
                    <tr>
                      <th>เธเนเธฒเธเธฃเธฑเธ</th>
                      <td>{detail.PAY ?? 0}</td>
                    </tr>
                    <tr>
                      <th>Money</th>
                      <td>{formatMoney(detail.MONEY)}</td>
                    </tr>
                    <tr>
                      <th>Paydate</th>
                      <td>{formatDate(detail.PAYDATE)}</td>
                    </tr>
                    <tr>
                      <th>เน€เธฅเธเธ—เธตเนเน€เธเนเธ</th>
                      <td>{detail.CHEQUE ?? "-"}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <datalist id="chequeOptions">
        {chequeOptions.map((cheque) => (
          <option key={cheque} value={cheque} />
        ))}
      </datalist>
      <datalist id="pnumberOptions">
        {pnumberOptions.map((pnumber) => (
          <option key={pnumber} value={pnumber} />
        ))}
      </datalist>

      <AppFooter />
    </div>
  );
}



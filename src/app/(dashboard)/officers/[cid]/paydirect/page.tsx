'use client';

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
import { AppHeader } from "@/components/layout/AppHeader";
import { Pagination, useReloadOnPageSizeChange } from "@/components/Pagination";

type OfficerInfo = {
  cid: string;
  name?: string | null;
  position?: string | null;
  station?: string | null;
};

type PaydirectItem = {
  id: string;
  A: string | null;
  B: string | null;
  NAMEMONTH_TH: string | null;
  TOTALINCOME: string | null;
  TOTALOUTCOME: string | null;
  BALANCE: string | null;
  PAYID: string | null;
};

type PaydirectResponse = {
  officer: OfficerInfo | null;
  items: PaydirectItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const formatMoney = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "-";
  const cleaned = typeof value === "string" ? value.replace(/,/g, "").trim() : value;
  const num = typeof cleaned === "number" ? cleaned : Number(cleaned);
  if (!Number.isFinite(num)) return String(value);
  const amountInBaht = num / 100;
  return amountInBaht.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function OfficerPaydirectPage() {
  const params = useParams<{ cid?: string }>();
  const router = useRouter();
  const cid = typeof params?.cid === "string" ? params.cid : "";

  const [data, setData] = useState<PaydirectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pageSize, setPageSize] = useState(10);
  useReloadOnPageSizeChange(pageSize, () => void loadPage(1));
  const loadPage = async (targetPage = 1) => {
    if (!cid) {
      setError("Missing CID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/officers/${cid}/paydirect?${params.toString()}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "โหลดข้อมูล paydirect ไม่สำเร็จ");
      }
      setData(json as PaydirectResponse);
    } catch (err: any) {
      setError(err?.message || "โหลดข้อมูล paydirect ไม่สำเร็จ");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  const displayRange = useMemo(() => {
    if (!data) return "0-0";
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return `${start}-${end}`;
  }, [data]);


  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/officers" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <div className="mb-3">
          <h1 className="h4 mb-0">ประวัติการจ่ายตรง</h1>
          <p className="small text-secondary mb-0 mt-1">แสดงข้อมูลจ่ายตรงของเจ้าหน้าที่</p>
        </div>

        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <div>
              {data?.officer && (
                <div className="mb-3">
                  <div className="fs-5 fw-bold">{data.officer.name ?? data.officer.cid}</div>
                  <div className="d-flex flex-wrap gap-3 small text-secondary">
                    <span>{`CID: ${data.officer.cid}`}</span>
                    {data.officer.position && <span>{data.officer.position}</span>}
                  </div>
                  {data.officer.station && (
                    <div className="d-flex flex-wrap gap-3 small text-secondary">
                      <span>{data.officer.station}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <span className="small text-secondary fw-semibold">
                แสดง {displayRange} จาก {data?.total ?? 0} รายการ
              </span>
   
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="border rounded overflow-hidden bg-white">

            <div className="table-responsive">
              <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
                <thead className="table-light">
                  <tr>
                    <th>เดือน</th>
                    <th>ปี</th>
                    <th>รายรับรวม</th>
                    <th>รายจ่ายรวม</th>
                    <th>คงเหลือ</th>
                    <th>สลิป</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={6} className="text-center text-secondary p-3">
                        กำลังโหลด...
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    data?.items?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.NAMEMONTH_TH ?? "-"}</td>
                        <td>{item.A ?? "-"}</td>
                        <td className="text-end text-nowrap">{formatMoney(item.TOTALINCOME)}</td>
                        <td className="text-end text-nowrap">{formatMoney(item.TOTALOUTCOME)}</td>
                        <td className="text-end text-nowrap">{formatMoney(item.BALANCE)}</td>
                        <td>
                          {item.PAYID ? (
                            <Link href={`/officers/paydirect/${item.PAYID}`} target="_blank">
                              ใบรับรองเงินเดือนนี้
                            </Link>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  {!loading && (!data || data.items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="text-center text-secondary p-3">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {data && (
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={pageSize}
                disabled={loading}
                onPageChange={(p) => loadPage(p)}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

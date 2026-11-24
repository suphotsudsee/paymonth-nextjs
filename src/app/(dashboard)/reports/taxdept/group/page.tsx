'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppFooter } from '@/components/layout/AppFooter';
import { Pagination } from '@/components/Pagination';

type Item = {
  ID: number;
  CID: string;
  NAME: string;
  NAMESTATION: string;
  YEARTHAI: string;
  SUMMONEY: number;
  TAX: number;
};

type ApiResult = {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalIncome: number;
  totalTax: number;
};

const formatMoney = (value: number) =>
  Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function TaxDeptGroupPage() {
  const search = useSearchParams();
  const [data, setData] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yearthai = search?.get('yearthai') || '';
  const station = search?.get('station') || '';

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchData = async (targetPage = 1, targetSize = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      // เดิมไม่ส่ง page/pageSize → API ให้แค่ 10 แถวแรก (PRD 11.1)
      const params = new URLSearchParams({ page: String(targetPage), pageSize: String(targetSize) });
      if (yearthai) params.set('yearthai', yearthai);
      if (station) params.set('station', station);
      const res = await fetch(`/api/reports/taxdept?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'ไม่สามารถโหลดข้อมูลได้');
      }
      setData(json);
      setPage(targetPage);
      setPageSize(targetSize);
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearthai, station]);

  const periodLabel = useMemo(() => {
    const yr = data?.items?.[0]?.YEARTHAI || yearthai;
    return yr ? `ม.ค.-ธ.ค.${yr}` : '';
  }, [data, yearthai]);

  return (
    <div className="d-flex flex-column flex-grow-1">
      <AppHeader activePath="/reports/taxdept" />

      <main className="container-fluid flex-grow-1 py-3 px-3 px-lg-4">
        <section className="card shadow-sm mb-3 overflow-hidden">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2 fw-semibold">
            <div>
              <h1 className="h5 fw-bold mb-0">หนังสือรับรองภาษีรายกลุ่ม</h1>
              <p className="small text-secondary mb-0 mt-1">
                ปีภาษี: {data?.items?.[0]?.YEARTHAI || yearthai || '-'} | สถานที่ปฏิบัติงาน: {station || '-'}
              </p>
            </div>
          </div>

          {error && <div className="alert alert-danger py-2 px-3 m-2 small">{error}</div>}

          <div className="table-responsive">
            <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
              <thead className="table-light">
                <tr>
                  <th>ลำดับที่</th>
                  <th>ชื่อ</th>
                  <th>cid</th>
                  <th>จำนวนบุตร</th>
                  <th>จำนวนเงินที่จ่าย</th>
                  <th>วดป ที่จ่าย</th>
                  <th>ประเภทเงินได้</th>
                  <th>จำนวนเงิน</th>
                  <th>รวมรายได้</th>
                  <th>หัก ภาษี</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data && (
                  <tr>
                    <td colSpan={10}>กำลังโหลดข้อมูล...</td>
                  </tr>
                )}
                {data?.items.map((row) => (
                  <tr key={row.ID}>
                    <td>{row.ID}</td>
                    <td className="text-wrap">{row.NAME}</td>
                    <td>{row.CID}</td>
                    <td>--</td>
                    <td>--</td>
                    <td>{periodLabel}</td>
                    <td>เงินเดือนตกเบิก</td>
                    <td className="text-end text-nowrap">{formatMoney(row.SUMMONEY)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.SUMMONEY)}</td>
                    <td className="text-end text-nowrap">{formatMoney(row.TAX)}</td>
                  </tr>
                ))}
                {data && data.items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={10} className="small text-secondary mb-0 mt-1">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data && (
            <div className="d-flex flex-wrap justify-content-end gap-4 px-3 py-2 border-top bg-light fw-bold small">
              <span>รวมรายได้: {formatMoney(data.totalIncome)}</span>
              <span>ภาษี: {formatMoney(data.totalTax)}</span>
            </div>
          )}

          {data && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              total={data.total}
              pageSize={pageSize}
              disabled={loading}
              onPageChange={(p) => fetchData(p, pageSize)}
              onPageSizeChange={(n) => void fetchData(1, n)}
            />
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}

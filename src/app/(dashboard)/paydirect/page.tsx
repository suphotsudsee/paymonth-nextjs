'use client';

import { useState } from 'react';

type Row = {
  ID: number | string; // BIGINT ที่เกินช่วง Number ปลอดภัยจะมาเป็น string (src/lib/json.ts)
  A: string | null;
  B: string | null;
  C: string | null;
  D: string | null;
  E: string | null;
  F: string | null;
  DEPART: string | null;
  NAMESTATION: string | null;
  SALARY: number | null;
  O: string | null;
  SALPOS: string | null;
  NOCLINIC: string | null;
  SUBJECT: string | null;
};

export default function PaydirectPage() {
  const [filters, setFilters] = useState({ xyear: '', xmonth: '', xtype_pis: '', nameprn: '' });
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (field: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters({ ...filters, [field]: e.target.value });

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams(filters as Record<string, string>);
    const res = await fetch(`/api/paydirect/report?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'โหลดข้อมูลไม่สำเร็จ');
      setItems([]);
    } else {
      setItems(data.items || []);
    }
    setLoading(false);
  };

  return (
    <main className="container-fluid py-3 vstack gap-3">
      <h1 className="h4 mb-0">Paydirect Report</h1>
      <form onSubmit={onSearch} className="d-flex flex-wrap gap-2">
        <input placeholder="Year (A)" value={filters.xyear} onChange={onChange('xyear')} className="form-control w-auto" />
        <input
          placeholder="Month (B)"
          value={filters.xmonth}
          onChange={onChange('xmonth')}
          className="form-control w-auto"
        />
        <input
          placeholder="Department contains"
          value={filters.xtype_pis}
          onChange={onChange('xtype_pis')}
          className="form-control w-auto"
        />
        <input
          placeholder="Station contains"
          value={filters.nameprn}
          onChange={onChange('nameprn')}
          className="form-control w-auto"
        />
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Loading…' : 'Search'}
        </button>
      </form>
      {error && <div className="alert alert-danger py-2 mb-0">{error}</div>}
      <div className="table-responsive">
        <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
          <thead className="table-light text-center">
            <tr>
              <th>Year(A)</th>
              <th>Month(B)</th>
              <th>CID(C)</th>
              <th>Station</th>
              <th>Depart</th>
              <th>Salary</th>
              <th>Subject</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.ID}>
                <td>{r.A}</td>
                <td>{r.B}</td>
                <td>{r.C}</td>
                <td>{r.NAMESTATION}</td>
                <td>{r.DEPART}</td>
                <td className="text-end text-nowrap">{Number(r.SALARY || 0).toLocaleString()}</td>
                <td>{r.SUBJECT}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7} className="text-center text-secondary p-3">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

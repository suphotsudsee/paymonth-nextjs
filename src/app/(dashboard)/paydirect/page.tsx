'use client';

import { useState } from 'react';

type Row = {
  ID: number;
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
    <main style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
      <h1>Paydirect Report</h1>
      <form onSubmit={onSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <input placeholder="Year (A)" value={filters.xyear} onChange={onChange('xyear')} style={{ padding: '0.5rem' }} />
        <input
          placeholder="Month (B)"
          value={filters.xmonth}
          onChange={onChange('xmonth')}
          style={{ padding: '0.5rem' }}
        />
        <input
          placeholder="Department contains"
          value={filters.xtype_pis}
          onChange={onChange('xtype_pis')}
          style={{ padding: '0.5rem' }}
        />
        <input
          placeholder="Station contains"
          value={filters.nameprn}
          onChange={onChange('nameprn')}
          style={{ padding: '0.5rem' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '0.5rem 0.75rem' }}>
          {loading ? 'Loading…' : 'Search'}
        </button>
      </form>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 900 }}>
          <thead style={{ textAlign: 'center' }}>
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
                <td>{Number(r.SALARY || 0).toLocaleString()}</td>
                <td>{r.SUBJECT}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '0.75rem' }}>
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

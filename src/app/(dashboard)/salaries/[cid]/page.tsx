type Row = {
  NAME: string;
  LPOS: string | null;
  NAMESTATION: string | null;
  CID: string;
  MONTHTHAI: string;
  YEARTHAI: string;
  NAMEMONTH_TH: string;
  INCOME: number;
  OUTCOME: number;
};

async function getReport(cid: string): Promise<Row[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/salaryuser/report?cid=${cid}`, {
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'โหลดข้อมูลไม่สำเร็จ');
  return data.items || [];
}

export default async function SalarySummaryPage({ params }: { params: { cid: string } }) {
  const rows = await getReport(params.cid);

  return (
    <main style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
      <h1>Salary Summary for {params.cid}</h1>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: 720 }}>
          <thead>
            <tr>
              <th>Month</th>
              <th>Year</th>
              <th>Income</th>
              <th>Deductions</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const income = Number(r.INCOME || 0);
              const outcome = Number(r.OUTCOME || 0);
              const net = income - outcome;
              return (
                <tr key={`${r.YEARTHAI}-${r.MONTHTHAI}`}>
                  <td>{r.NAMEMONTH_TH}</td>
                  <td>{r.YEARTHAI}</td>
                  <td>{income.toLocaleString()}</td>
                  <td>{outcome.toLocaleString()}</td>
                  <td>{net.toLocaleString()}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '0.75rem' }}>
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

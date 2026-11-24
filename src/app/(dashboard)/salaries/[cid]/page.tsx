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
    <main className="container-fluid py-3 vstack gap-3">
      <h1 className="h4 mb-0">Salary Summary for {params.cid}</h1>
      <div className="table-responsive">
        <table className="table table-bordered table-striped table-hover table-sm align-middle mb-0 small">
          <thead className="table-light text-center">
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
                  <td className="text-end text-nowrap">{income.toLocaleString()}</td>
                  <td className="text-end text-nowrap">{outcome.toLocaleString()}</td>
                  <td className="text-end text-nowrap">{net.toLocaleString()}</td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={5} className="text-center text-secondary p-3">
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

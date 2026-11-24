"use client";

import { useEffect, useState } from "react";

export function AppFooter() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="text-center small text-secondary bg-light border-top py-3 px-2 mt-auto d-print-none">
      <div>
        Copyright © {year} by สุพจน์ สุดสี.
      </div>
      <div>All Rights Reserved.</div>
      <div>
        กลุ่มงานสุขภาพดิจิท้ล สำนักงานสาธารณสุขจังหวัดอุบลราชธานี
      </div>
    </footer>
  );
}

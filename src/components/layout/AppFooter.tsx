"use client";

import { useEffect, useState } from "react";
import styles from "./HeaderFooter.module.css";

export function AppFooter() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className={styles.footer}>
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

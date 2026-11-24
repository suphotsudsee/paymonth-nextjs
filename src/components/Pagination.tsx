'use client';

import { useEffect, useId, useRef } from 'react';
import { PAGE_SIZE_OPTIONS, pageCorrection, pageItems, pageRange } from '@/lib/pagination';

type Props = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
};

// แถบแบ่งหน้ามาตรฐานของทุกหน้า (PRD ข้อ 11.1): จำนวนต่อหน้า + ช่วงรายการ + Bootstrap .pagination
export function Pagination({ page, totalPages, total, pageSize, onPageChange, onPageSizeChange, disabled }: Props) {
  const selectId = useId();
  const pages = Math.max(0, totalPages);
  const { from, to } = pageRange(page, pageSize, total);
  const go = (p: number) => {
    if (disabled || p < 1 || p > pages || p === page) return;
    onPageChange(p);
  };
  const atFirst = page <= 1;
  const atLast = page >= pages;

  // หน้าปัจจุบันเกินหน้าสุดท้ายแล้ว (ข้อมูลลดลงระหว่างเปลี่ยนหน้า) → ไปหน้าสุดท้ายที่มีอยู่จริง
  // ลองครั้งเดียวต่อคู่ (page, totalPages) ถ้าโหลดไม่สำเร็จไม่วนซ้ำ (pageCorrection)
  const onPageChangeRef = useRef(onPageChange);
  const lastCorrection = useRef<string | null>(null);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  });
  useEffect(() => {
    const fix = pageCorrection(page, pages, !!disabled, lastCorrection.current);
    if (!fix) return;
    lastCorrection.current = fix.key;
    onPageChangeRef.current(fix.target);
  }, [page, pages, disabled]);

  // « » ซ่อนบนจอ < 576px (มีเลขหน้าแรก/สุดท้ายให้กดอยู่แล้ว) เพื่อให้แถบอยู่บรรทัดเดียวบนมือถือ
  const navButton = (label: string, symbol: string, target: number, off: boolean, hideOnXs = false) => (
    <li className={`page-item${off || disabled ? ' disabled' : ''}${hideOnXs ? ' d-none d-sm-block' : ''}`}>
      <button type="button" className="page-link" aria-label={label} title={label} disabled={off || disabled} onClick={() => go(target)}>
        <span aria-hidden="true">{symbol}</span>
      </button>
    </li>
  );

  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2 border-top bg-light small d-print-none">
      <div className="d-flex flex-wrap align-items-center gap-2">
        <label htmlFor={selectId} className="mb-0 text-nowrap">แสดง</label>
        <select
          id={selectId}
          className="form-select form-select-sm w-auto"
          value={pageSize}
          disabled={disabled}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="text-nowrap">รายการต่อหน้า</span>
        <span className="text-secondary text-nowrap">
          · รายการที่ {from.toLocaleString()}–{to.toLocaleString()} จาก {total.toLocaleString()}
        </span>
      </div>
      {pages > 0 && (
        <nav aria-label="เปลี่ยนหน้า">
          <ul className="pagination pagination-sm flex-wrap mb-0">
            {navButton('หน้าแรก', '«', 1, atFirst, true)}
            {navButton('หน้าก่อนหน้า', '‹', page - 1, atFirst)}
            {pageItems(page, pages).map((item, idx) =>
              item === 'gap' ? (
                <li key={`gap-${idx}`} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              ) : (
                <li key={item} className={`page-item${item === page ? ' active' : ''}${disabled && item !== page ? ' disabled' : ''}`}>
                  <button
                    type="button"
                    className="page-link"
                    aria-current={item === page ? 'page' : undefined}
                    disabled={disabled && item !== page}
                    onClick={() => go(item)}
                  >
                    {item}
                  </button>
                </li>
              ),
            )}
            {navButton('หน้าถัดไป', '›', page + 1, atLast)}
            {navButton('หน้าสุดท้าย', '»', pages, atLast, true)}
          </ul>
        </nav>
      )}
    </div>
  );
}

/**
 * โหลดหน้า 1 ใหม่เมื่อจำนวนต่อหน้าเปลี่ยน — สำหรับหน้าที่ฟังก์ชันโหลดอ่าน pageSize จาก state
 * เทียบกับค่าก่อนหน้า (ไม่ใช่ "ข้ามครั้งแรก") จึงไม่โหลดซ้ำตอน mount แม้ React StrictMode รัน effect สองรอบ
 */
export function useReloadOnPageSizeChange(pageSize: number, reload: () => void) {
  const reloadRef = useRef(reload);
  const prevSize = useRef(pageSize);
  useEffect(() => {
    reloadRef.current = reload;
  });
  useEffect(() => {
    if (prevSize.current === pageSize) return;
    prevSize.current = pageSize;
    reloadRef.current();
  }, [pageSize]);
}

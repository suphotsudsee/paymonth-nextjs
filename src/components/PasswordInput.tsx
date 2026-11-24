'use client';

import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /**
   * เปลี่ยนค่านี้เมื่อใดก็ตาม รหัสผ่านจะกลับไปซ่อน
   * ใช้กับฟอร์มที่ไม่ได้อยู่ใน <form> (เช่น modal ที่กดปุ่มบันทึกด้วย onClick) — เพิ่มค่าทุกครั้งที่กดบันทึก
   */
  concealKey?: unknown;
};

// ช่องรหัสผ่านพร้อมปุ่มรูปตา กดเพื่อแสดง/ซ่อนรหัสที่พิมพ์ (Bootstrap input-group — PRD ข้อ 11)
// ซ่อนกลับเองทุกครั้งที่ส่งฟอร์ม (รวมครั้งที่ login ไม่ผ่านและฟอร์มยังเปิดอยู่) เพื่อไม่ให้รหัสค้างบนจอ
export function PasswordInput({ className, concealKey, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const label = visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน';

  // ฟอร์มที่ครอบช่องนี้ถูก submit หรือ reset → ซ่อน
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const conceal = () => setVisible(false);
    form.addEventListener('submit', conceal);
    form.addEventListener('reset', conceal);
    return () => {
      form.removeEventListener('submit', conceal);
      form.removeEventListener('reset', conceal);
    };
  }, []);

  // ผู้ใช้ component ส่งสัญญาณว่ากดบันทึกแล้ว → ซ่อน
  useEffect(() => {
    setVisible(false);
  }, [concealKey]);

  return (
    <div className="input-group">
      <input
        {...props}
        ref={inputRef}
        type={visible ? 'text' : 'password'}
        className={['form-control', className].filter(Boolean).join(' ')}
      />
      <button
        type="button"
        className="btn btn-outline-secondary d-flex align-items-center"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
      >
        {/* 18px = ขนาดไอคอนเดิม พอดีกับความสูงช่อง form-control */}
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}

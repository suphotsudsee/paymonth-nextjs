'use client';

import { useEffect, useRef, useState, type CSSProperties, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /**
   * เปลี่ยนค่านี้เมื่อใดก็ตาม รหัสผ่านจะกลับไปซ่อน
   * ใช้กับฟอร์มที่ไม่ได้อยู่ใน <form> (เช่น modal ที่กดปุ่มบันทึกด้วย onClick) — เพิ่มค่าทุกครั้งที่กดบันทึก
   */
  concealKey?: unknown;
};

// ช่องรหัสผ่านพร้อมปุ่มรูปตา กดเพื่อแสดง/ซ่อนรหัสที่พิมพ์
// ซ่อนกลับเองทุกครั้งที่ส่งฟอร์ม (รวมครั้งที่ login ไม่ผ่านและฟอร์มยังเปิดอยู่) เพื่อไม่ให้รหัสค้างบนจอ
export function PasswordInput({ style, concealKey, ...props }: Props) {
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
    <span style={{ position: 'relative', display: 'block', width: '100%' }}>
      <input
        {...props}
        ref={inputRef}
        type={visible ? 'text' : 'password'}
        // เว้นที่ขวาให้ปุ่มตา: ไอคอน 18px + ระยะขอบ 8px ทั้งสองข้าง ≈ 36px
        style={{ ...style, width: '100%', paddingRight: 36, boxSizing: 'border-box' } as CSSProperties}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        style={{
          position: 'absolute',
          top: '50%',
          right: 6,
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          padding: 4,
          border: 'none',
          background: 'transparent',
          color: '#555',
          cursor: 'pointer',
        }}
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </span>
  );
}

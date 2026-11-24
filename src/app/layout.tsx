import type { Metadata } from "next";
import type { ReactNode } from "react";
// Bootstrap ก่อน globals.css เพื่อให้กฎของเราที่เหลือ (ไม่กี่ข้อ) ทับได้ — PRD ข้อ 11
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayMonth",
  description: "Payroll management portal",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    // บังคับโหมดสว่างเหมือนเดิม (หน้าเดิมพื้นหลังสว่างเสมอ)
    <html lang="th" data-bs-theme="light">
      <body className="d-flex flex-column min-vh-100 bg-body-tertiary">
        <div className="d-flex flex-column flex-grow-1 w-100">{children}</div>
      </body>
    </html>
  );
}

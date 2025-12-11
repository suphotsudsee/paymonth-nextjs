import type { Metadata } from "next";
import type { ReactNode } from "react";
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
    <html lang="en">
      <body className="app-shell">
        <div className="app-content">{children}</div>
      </body>
    </html>
  );
}

"use client";

import Image from "next/image";

export default function LogoPage() {
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center gap-4 bg-light p-4">
      <div className="text-center">
        <p className="small fw-semibold text-secondary text-uppercase mb-2">Logo Preview</p>
        <h1 className="h2 fw-bold">PayMonth</h1>
        <p className="text-secondary mb-0">Updated identity preview for crisp rendering.</p>
      </div>

      <div className="card shadow-sm p-4 d-flex align-items-center justify-content-center">
        <Image src="/logo.png" alt="PayMonth logo" width={220} height={60} className="mx-auto" priority />
      </div>
    </div>
  );
}

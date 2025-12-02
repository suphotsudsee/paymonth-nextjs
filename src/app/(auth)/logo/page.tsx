"use client";

import Image from "next/image";

export default function LogoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 p-6">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold text-slate-500 uppercase tracking-[0.2em]">
          Logo Preview
        </p>
        <h1 className="text-3xl font-bold text-slate-900">PayMonth</h1>
        <p className="text-slate-600">
          Updated identity preview for crisp rendering.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex items-center justify-center">
        <Image
          src="/logo.png"
          alt="PayMonth logo"
          width={220}
          height={60}
          className="mx-auto"
          priority
        />
      </div>
    </div>
  );
}

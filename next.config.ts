import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone: build ได้โฟลเดอร์ .next/standalone ที่มี server.js + node_modules เท่าที่ใช้
  // ใช้กับ Dockerfile (deploy บน Coolify) — `next start` บน PM2 เดิมยังใช้ได้ตามปกติ
  output: "standalone",
};

export default nextConfig;

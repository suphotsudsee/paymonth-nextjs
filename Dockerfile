# Deploy บน Coolify (งาน #19) — build แบบ multi-stage ได้ image ที่มีเฉพาะ .next/standalone
# node 24 = Active LTS (node 20 หมดอายุ เม.ย. 2026 — Codex งาน #19); ตรงกับ @types/node ^24 ใน package.json; bookworm-slim (glibc) ใช้ Prisma engine ตัวปกติได้ ไม่ต้องตั้ง binaryTargets แบบ musl
FROM node:24-bookworm-slim AS deps
WORKDIR /app
# openssl: Prisma query engine ต้องใช้ตรวจรุ่น libssl
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall รัน prisma generate ให้เอง (ต้อง copy prisma/ ก่อน)
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# 3000 = พอร์ตเริ่มต้นของ Coolify สำหรับแอป Next.js (ตั้ง Ports Exposes ใน Coolify ให้ตรง)
RUN groupadd -r app && useradd -r -g app app
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
CMD ["node", "server.js"]

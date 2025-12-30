# ===================================================
# Lin Blog - Next.js Production Dockerfile
# ===================================================
# 使用 Debian-based 映像以確保 Prisma OpenSSL 相容性

FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------
# 階段 1: 安裝依賴
# ---------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# ---------------------------------------------------
# 階段 2: 建置應用程式
# ---------------------------------------------------
FROM base AS builder
WORKDIR /app

# Build-time 環境變數（僅用於通過 Next.js build 驗證）
ARG NEXTAUTH_SECRET=build-time-placeholder-secret-32chars
ARG NEXTAUTH_URL=http://localhost:3000
ARG DATABASE_URL=postgresql://user:password@localhost:5432/db
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
# NEXT_PUBLIC_UPLOAD_BASE_URL 不設預設值，local storage 使用相對路徑
# 切換到 CDN (R2) 時再透過 build-arg 傳入，例如:
# docker build --build-arg NEXT_PUBLIC_UPLOAD_BASE_URL=https://cdn.example.com
ARG NEXT_PUBLIC_UPLOAD_BASE_URL=
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_GA_ID=
ARG NEXT_PUBLIC_GTM_ID=
ARG NEXT_PUBLIC_FB_PIXEL_ID=

ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    NEXTAUTH_URL=$NEXTAUTH_URL \
    DATABASE_URL=$DATABASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_UPLOAD_BASE_URL=$NEXT_PUBLIC_UPLOAD_BASE_URL \
    NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_GTM_ID=$NEXT_PUBLIC_GTM_ID \
    NEXT_PUBLIC_FB_PIXEL_ID=$NEXT_PUBLIC_FB_PIXEL_ID

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate && npm run build

# ---------------------------------------------------
# 階段 3: 執行環境
# ---------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# 建立非 root 使用者（含 home 目錄）
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs && \
    mkdir .next && chown nextjs:nodejs .next

# 複製應用程式檔案
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 複製 Prisma 相關檔案（用於 migration 和初始化）
# Migration: docker exec blog_app node node_modules/prisma/build/index.js migrate deploy
# 初始化: docker exec blog_app node scripts/init-admin.js
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# 複製 bcryptjs（用於密碼驗證）
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs

# 複製初始化腳本
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

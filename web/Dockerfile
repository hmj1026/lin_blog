# ===================================================
# Lin Blog - Next.js Production Dockerfile
# ===================================================
# 使用多階段建置來最小化最終映像大小

FROM node:20-alpine AS base

# ---------------------------------------------------
# 階段 1: 安裝依賴
# ---------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 複製 package 檔案
COPY package.json package-lock.json ./

# 安裝所有依賴（包含 devDependencies，因為需要 build）
RUN npm ci

# ---------------------------------------------------
# 階段 2: 建置應用程式
# ---------------------------------------------------
FROM base AS builder
WORKDIR /app

# 複製依賴
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 產生 Prisma Client
RUN npx prisma generate

# 建置 Next.js（使用 standalone 模式）
RUN npm run build

# ---------------------------------------------------
# 階段 3: 執行環境
# ---------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製 public 資料夾
COPY --from=builder /app/public ./public

# 設定正確的權限
RUN mkdir .next
RUN chown nextjs:nodejs .next

# 複製 standalone 輸出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 複製 Prisma 檔案（用於 migration）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 切換到非 root 使用者
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

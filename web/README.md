# Lin Blog

一個現代化的部落格系統，採用 Next.js 16 App Router 架構，具備完整的後台管理、RBAC 權限控制、媒體管理與文章分析功能。

## ✨ 功能特色

### 前台
- 📝 部落格文章展示（支援分類、標籤篩選）
- 🔍 全站搜尋功能
- 📱 響應式設計
- 🚀 SEO 優化（sitemap、RSS feed、Open Graph）
- 📊 文章瀏覽追蹤

### 後台管理
- 📄 文章 CRUD（草稿、發布、排程）
- 🏷️ 分類與標籤管理
- 🖼️ 媒體庫（圖片上傳、裁切）
- 👥 使用者與角色管理（RBAC）
- 📈 文章分析報表
- 📜 文章版本歷史
- ⚙️ 網站設定

---

## 🛠️ 技術棧

| 類別 | 技術 |
|------|------|
| **框架** | Next.js 16 (App Router) |
| **語言** | TypeScript |
| **資料庫** | PostgreSQL + Prisma ORM |
| **認證** | NextAuth.js v4 |
| **編輯器** | TipTap (WYSIWYG) |
| **樣式** | Tailwind CSS |
| **測試** | Vitest + Playwright |

---

## 📁 專案結構

```
lin_blog/
├── web/                          # Next.js 應用程式
│   ├── prisma/                   # Prisma schema & migrations
│   ├── src/
│   │   ├── app/                  # App Router 路由
│   │   │   ├── (admin)/          # 後台頁面（需登入）
│   │   │   ├── (frontend)/       # 前台頁面
│   │   │   ├── api/              # API Routes
│   │   │   └── login/            # 登入頁面
│   │   ├── components/           # React 元件
│   │   ├── lib/                  # 工具函式
│   │   └── modules/              # DDD 模組
│   │       ├── analytics/        # 分析模組
│   │       ├── media/            # 媒體模組
│   │       ├── posts/            # 文章模組
│   │       ├── security-admin/   # 權限模組
│   │       └── site-settings/    # 設定模組
│   ├── storage/                  # 本機檔案儲存
│   └── tests/                    # 測試檔案
└── openspec/                     # 規格文件
```

---

## 🚀 快速開始

### 系統需求

- Node.js 20+
- PostgreSQL 15+
- npm / yarn / pnpm

### 1. 安裝依賴

```bash
cd web
npm install
```

### 2. 環境設定

複製 `.env.example` 並填入設定：

```bash
cd ..
cp .env.example .env
cd web && ln -sf ../.env .env
```

必要設定：

```bash
# 資料庫連線
DATABASE_URL="postgresql://user:password@localhost:5432/lin_blog"

# NextAuth 設定
NEXTAUTH_SECRET="your-random-secret-at-least-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. 初始化資料庫

```bash
# 同步 schema 到資料庫
npm run db:push

# 建立初始資料（角色、權限、預設使用者）
npm run db:seed
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 http://localhost:3000 即可看到前台。

### 5. 登入後台

開啟 http://localhost:3000/login

預設管理員帳號（由 seed 建立）：
- Email: `admin@example.com`
- Password: `admin123`

---

## ⚙️ 環境變數說明

### 必要設定

| 變數 | 說明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 連線字串 |
| `NEXTAUTH_SECRET` | Session 加密金鑰（至少 32 字元） |
| `NEXTAUTH_URL` | 網站 URL |

### Storage 設定

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `STORAGE_PROVIDER` | 儲存後端 (`local` / `s3` / `r2` / `gcs`) | `local` |
| `UPLOAD_MAX_FILE_SIZE_MB` | 單檔上傳大小上限 (MB) | `10` |

<details>
<summary>雲端 Storage 設定（S3 / R2 / GCS）</summary>

**AWS S3**
```bash
STORAGE_PROVIDER=s3
STORAGE_BUCKET=your-bucket
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret
```

**Cloudflare R2**
```bash
STORAGE_PROVIDER=r2
STORAGE_BUCKET=your-bucket
STORAGE_ENDPOINT=https://xxx.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=your-key
STORAGE_SECRET_ACCESS_KEY=your-secret
```

**Google Cloud Storage**
```bash
STORAGE_PROVIDER=gcs
STORAGE_BUCKET=your-bucket
GCS_PROJECT_ID=your-project
GCS_CLIENT_EMAIL=sa@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

</details>

### Analytics（選用）

| 變數 | 說明 |
|------|------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID |
| `NEXT_PUBLIC_GTM_ID` | Google Tag Manager ID |
| `NEXT_PUBLIC_FB_PIXEL_ID` | Facebook Pixel ID |

---

## 🧪 測試

測試框架：Vitest + Playwright

```bash
# 單元測試
npm run test

# 單元測試（watch mode）
npm run test:ui

# E2E 測試
npm run test:e2e

# 覆蓋率報告
npx vitest run --coverage
```

### 測試統計

| 類別 | 測試數量 |
|------|----------|
| Unit Tests | 643 |
| E2E Tests | 20+ |
| **總計** | **660+** |

---

## 🚢 部署

### Vercel 部署

1. 連結 GitHub repo 到 Vercel
2. 設定環境變數（至少需要 `DATABASE_URL`、`NEXTAUTH_SECRET`）
3. Build command: `npm run build`
4. 部署完成後設定 `NEXTAUTH_URL` 為正式域名

### Docker 部署（推薦）

```bash
# 建置並啟動
docker-compose up -d --build

# 資料庫同步
docker exec blog_app node node_modules/prisma/build/index.js db push --accept-data-loss

# 初始化站點設定
docker exec blog_app node scripts/init-admin.js

# 建立管理員帳號
PASSWORD=your-password docker exec -e PASSWORD blog_app node scripts/create-user.js \
  --email admin@example.com \
  --name Admin \
  --role ADMIN
```

```yaml
# docker-compose.yml 範例
version: '3.8'
services:
  app:
    build: ./web
    container_name: blog_app
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/lin_blog
      - NEXTAUTH_SECRET=your-secret
      - NEXTAUTH_URL=http://localhost:3000
    depends_on:
      - db
    volumes:
      - ./web/storage:/app/storage

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=lin_blog
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 手動部署

```bash
# 建置
npm run build

# 啟動（需設定環境變數）
npm run start
```

---

## 📖 開發指南

### 資料庫異動

```bash
# 修改 prisma/schema.prisma 後
npm run db:push      # 開發環境同步
npx prisma migrate dev --name "migration_name"  # 正式環境 migration
```

### 新增 API 路由

API 路由位於 `src/app/api/`，遵循 Next.js App Router 慣例：

```typescript
// src/app/api/example/route.ts
import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";

export async function GET() {
  const authError = await requirePermission("example:read");
  if (authError) return authError;

  return jsonOk({ message: "Hello" });
}
```

### 權限控制

權限在 `prisma/seed.ts` 中定義，格式為 `resource:action`：

- `posts:write` - 文章新增/編輯
- `uploads:write` - 上傳檔案
- `users:manage` - 使用者管理

---

## 📝 License

MIT

---

## 🤝 Contributing

歡迎提交 Issue 與 Pull Request！

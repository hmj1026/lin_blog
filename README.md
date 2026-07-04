# Lin Blog

一個現代化的部落格系統，採用 Next.js 15 App Router 架構，具備完整的後台管理、RBAC 權限控制、媒體管理與文章分析功能。

## ✨ 功能特色

### 前台
- 📝 部落格文章展示（支援分類、標籤篩選）
- 🔍 全站搜尋功能
- 📱 響應式設計
- 🚀 SEO 優化（sitemap、RSS feed、Open Graph）

### 後台管理
- 📄 文章 CRUD（草稿、發布、排程）
- 🏷️ 分類與標籤管理
- 🖼️ 媒體庫（圖片上傳、裁切）
- 👥 使用者與角色管理（RBAC）
- 📈 文章分析報表

---

## 🛠️ 技術棧

| 類別 | 技術 |
|------|------|
| **框架** | Next.js 15 (App Router) |
| **語言** | TypeScript |
| **資料庫** | PostgreSQL + Prisma ORM |
| **認證** | NextAuth.js v4 |
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
│   │   ├── components/           # React 元件
│   │   ├── lib/                  # 工具函式
│   │   └── modules/              # DDD 模組
│   └── tests/                    # 測試檔案
├── docs/                         # 專案文件
│   ├── architecture/             # 架構文件
│   ├── adr/                      # Architecture Decision Records
│   ├── database.md               # 資料庫管理指南
│   └── development.md            # 本地開發指南
├── nginx/                        # Nginx 配置
├── docker-compose.yml            # Docker 部署配置
└── .env.example                  # 環境變數範例（統一管理）
```

---

## 🚀 快速開始

### 本地開發

```bash
cd web
npm install
cd .. && cp .env.example .env     # 環境變數統一於根目錄
cd web && ln -sf ../.env .env     # 建立 symlink
nano ../.env                      # 編輯設定
npm run db:push
npm run db:seed
npm run dev
```

詳見 [本地開發指南](docs/development.md)

### Docker 部署

```bash
cp .env.example .env        # 複製並編輯環境變數（DB 帳密、NEXTAUTH_SECRET 等）
docker compose up -d --build  # 由 ./web 建置映像並啟動 app + postgres
```

啟動後：

```bash
docker compose exec blog node node_modules/prisma/build/index.js migrate deploy  # 套用 migration
docker compose exec blog node scripts/init-admin.js                              # 首次建立管理員
```

- app 對外埠由 `BLOG_PORT`（預設 `3100`）控制，容器內固定 `3000`。
- 正式環境可改用 CI 推送至 GHCR 的映像：`docker compose pull blog && docker compose up -d`。

### CI / CD

- **CI**（`.github/workflows/ci.yml`）：每個對 `main` 的 PR 與 push 會在 Node 20／22（受支援的 LTS）上執行 ESLint、TypeScript 型別檢查、Vitest 單元測試與 Next.js build。
- **映像建置**（`.github/workflows/docker-build.yml`）：push 到 `main` 時，於 CI 通過後由 `./web` 建置並推送映像至 GHCR（`ghcr.io/<repo>`）。
- **CD**（`.github/workflows/cd.yml`，選配）：push 到 `develop` 自動部署至 Staging，Production 透過手動觸發（workflow_dispatch）部署。
- **Branch protection（建議）**：`main` 應啟用保護規則——要求上述 CI 通過並取得 Code Review 核准後方可合併。此為 GitHub 儲存庫設定，需由具 admin 權限者於 repo Settings → Branches 手動啟用。

---

## 📖 文件

| 文件 | 說明 |
|-----|------|
| [架構文件](docs/architecture/architecture.md) | C4 架構圖、DDD 模組說明 |
| [本地開發指南](docs/development.md) | 環境設定、常用指令 |
| [資料庫管理](docs/database.md) | Migration 流程、Schema 說明 |
| [ADR](docs/adr/README.md) | 架構決策記錄 |
| [API 文件](docs/api.md) | API 端點說明 |

---

## 🧪 測試

```bash
cd web
npm run test        # 單元測試
npm run test:e2e    # E2E 測試
```

---

## 📝 License

MIT

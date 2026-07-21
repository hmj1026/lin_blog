# Lin Blog

一個現代化的部落格系統，採用 Next.js 16 App Router 架構，具備完整的後台管理、RBAC 權限控制、媒體管理與文章分析功能。

## ✨ 功能特色

### 前台
提供完整響應式、SEO 優化的部落格前台展示。詳見 [前台功能指南](docs/frontend-features.md)。
- 📝 文章閱讀與分類、標籤多重篩選
- 🔍 基於關鍵字的全站即時搜尋功能
- 📱 375px~1440px 完整響應式與無障礙閱讀體驗
- 🚀 SEO 優化（自動生成動態 sitemap、RSS feed 與 Open Graph 標記）
- ✉️ 電子報訂閱元件與驗證防護

### 後台管理
提供完整的文章、分類、標籤、媒體、訂閱者、使用者與 RBAC 權限管理系統。詳見 [後台功能指南](docs/admin-features.md)。
- 📄 文章 CRUD（支援草稿、排程、自動儲存與離頁保護）
- 🏷️ 分類與標籤安全合併與文章使用量統計
- 🖼️ 媒體庫及文章內文引用關係安全檢查
- 👥 使用者與角色管理（防範最後管理員停用保護）
- 📈 無界資料庫文章分析報表與來源分類機制
- 🔄 統一的分頁溢位安全重查與 `AdminTable` 響應式無障礙元件


---

## 🛠️ 技術棧

| 類別 | 技術 |
|------|------|
| **框架** | Next.js 16 (App Router) |
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

- **CI**（`.github/workflows/ci.yml`）：對 `main`／`develop` 的 PR 執行品質閘門（單一 Node 22 矩陣）；`main` 的合併後驗證由 `docker-build.yml` 透過 `workflow_call` 重用 CI。
- **E2E**（`.github/workflows/e2e.yml`）：僅對 `main`／`develop` 的 PR 與手動觸發（`workflow_dispatch`）執行 Playwright 端對端測試（PR→develop 功能閘門、PR→main release 閘門）；已移除 push 到 `main` 的冗餘重跑。
- **映像建置**（`.github/workflows/docker-build.yml`）：符合 paths 的 push 到 `main` 或 `vX.Y.Z` tag 時，在 CI（單一 Node 22）通過後建置並推送映像至 GHCR（`ghcr.io/<repo>`）；tag push 不受 paths 過濾。
- **CD**（`.github/workflows/cd.yml`）：目前停用；正式環境依 [release 流程](release.md) 使用 immutable tag 或 SHA 人工部署。
- **Branch protection**：`main` 必須要求已配置的 CI checks 與 Code Review；E2E 是 release gate，實際 required status context 需與 GitHub Actions 目前 job 名稱同步（CI 矩陣為單一 Node 22 時為 4 個 `(Node 22)` checks）。分支慣例：`feature/*`、`fix/*` 從 `develop` 切出；`hotfix/*` 從 `main` 切出、PR→`main`、release 後 sync 回 `develop`。

---

## 📖 文件

| 文件 | 說明 |
|-----|------|
| [前台功能指南](docs/frontend-features.md) | 前台頁面展示與後台設定連動機制 |
| [後台功能指南](docs/admin-features.md) | 後台各分頁功能說明與安全機制 |
| [權限與角色指南](docs/permissions.md) | 後台 RBAC 權限定義、相依關係與安全機制 |
| [維運與管理腳本指南](docs/scripts.md) | 系統初始化、使用者建立與伺服器自動化維運腳本說明 |
| [架構文件](docs/architecture/architecture.md) | C4 架構圖、DDD 模組說明 |


| [本地開發指南](docs/development.md) | 環境設定、常用指令 |
| [資料庫管理](docs/database.md) | Migration 流程、Schema 說明 |
| [ADR](docs/adr/README.md) | 架構決策記錄 |
| [API 文件](docs/api.md) | API 端點說明 |
| [Release 流程](release.md) | Git Flow、版本發布、部署與回滾規範 |

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

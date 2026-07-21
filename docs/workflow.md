# 開發到部署完整流程指南

本文件說明 Lin Blog 專案從開發新功能到正式上線的完整流程。

後台日常操作、預設角色權限、文章統計口徑、活動紀錄保存與回滾原則，請參閱 [後台管理操作與資料治理指南](admin-management.md)。

---

## 目錄

1. [流程概覽](#流程概覽)
2. [環境準備](#環境準備)
3. [開發階段](#開發階段)
4. [提交與推送](#提交與推送)
5. [Pull Request 與 CI 測試](#pull-request-與-ci-測試)
6. [Release 與合併到主分支](#release-與合併到主分支)
7. [部署到正式伺服器](#部署到正式伺服器)
8. [驗證與監控](#驗證與監控)
9. [常見問題排解](#常見問題排解)

---

## 流程概覽

```mermaid
graph LR
    A[從 develop 建立 feature/fix] --> B[PR 合併到 develop]
    B --> C[建立 release/vX.Y.Z]
    C --> D[版本與 CHANGELOG]
    D --> E[PR 合併到 main]
    E --> F[建立 vX.Y.Z tag]
    F --> G[CI 建置 GHCR image]
    G --> H[人工部署 immutable image]
    H --> I[PR main → develop]
    B --> J{CI 或 E2E 失敗?}
    J -->|是| K[在工作分支修復]
    K --> B
```

### 分支策略

| 分支 | 用途 | 保護規則 |
|------|------|----------|
| `main` | 正式版本，僅透過 PR 合併 | ✅ 需通過 CI、E2E 與 Code Review |
| `develop` | 永久整合分支，功能 PR 的合併目標 | ❌ GitHub 目前未啟用保護，但流程仍要求走 PR |
| `feature/*` | 從 `develop` 建立的新功能或一般變更 | ❌ 無保護 |
| `fix/*` | 從 `develop` 建立的一般錯誤修正 | ❌ 無保護 |
| `release/vX.Y.Z` | 從 `develop` 建立的版本發布分支，準備版號與 CHANGELOG 後 PR 到 `main` | ❌ 無保護（合併目標 `main` 有保護） |
| `hotfix/*` | 從 `main` 建立的 production 緊急修正，完成後同步回 `develop` | ❌ 無保護 |

完整分支方向、版本、tag、部署與回滾規範見 [release.md](../release.md)。

---

## 環境準備

### 1. Clone 專案

```bash
git clone https://github.com/hmj1026/lin_blog.git
cd lin_blog
```

### 2. 安裝依賴

```bash
cd web
npm install
```

### 3. 設定環境變數

```bash
# 從根目錄複製範例
cp .env.example .env

# 建立 web/ 目錄的 symlink（Next.js 需要）
ln -sf ../.env web/.env
```

### 4. 編輯 `.env` 填入必要變數

```env
# 資料庫（本地開發可使用 Docker 啟動 PostgreSQL）
DATABASE_URL=postgresql://user:password@localhost:5432/lin_blog

# NextAuth Secret（可用 node scripts/generate-secret.js 產生）
NEXTAUTH_SECRET=your-secret-key

# 其他選填變數...
```

### 5. 初始化資料庫

```bash
cd web
npx prisma generate
npx prisma db push
```

### 6. 啟動開發伺服器

```bash
npm run dev
```

瀏覽器開啟 http://localhost:3000

---

## 開發階段

### 1. 從 develop 建立工作分支

```bash
git fetch origin --prune
git switch develop
git pull --ff-only origin develop
git switch -c feature/<name>
```

一般錯誤修正使用 `fix/<name>`。production 緊急修正才使用 `hotfix/<name>`，並從 `main` 建立。

### 2. 開發新功能

在 `web/` 目錄下進行開發，主要目錄結構：

```
web/
├── src/
│   ├── app/           # Next.js App Router 頁面
│   ├── components/    # React 元件
│   ├── modules/       # 業務邏輯模組（Clean Architecture）
│   └── lib/           # 共用工具函式
├── tests/             # 測試檔案
└── prisma/            # 資料庫 Schema
```

### 3. 本地測試

```bash
# 執行所有測試
npm test

# 執行單一測試檔案
npm test -- --run tests/unit/your-test.test.ts

# TypeScript 類型檢查
npx tsc --noEmit

# ESLint 檢查
npm run lint

# 建置測試（確保可以正常 build）
npm run build
```

---

## 提交與推送

### 1. 確認變更

```bash
git status
git diff
```

### 2. 暫存變更

```bash
# 暫存所有變更
git add -A

# 或只暫存特定檔案
git add path/to/file
```

### 3. 提交 Commit

遵循 Conventional Commits 規範：

```bash
# 新功能
git commit -m "feat: 新增文章匯出功能"

# 修復
git commit -m "fix: 修正圖片上傳失敗問題"

# 文件
git commit -m "docs: 更新部署說明"

# 重構
git commit -m "refactor: 重構 storage adapter"

# 測試
git commit -m "test: 新增 posts repository 測試"

# CI/CD
git commit -m "ci: 修正 GitHub Actions 環境變數"
```

### 4. 推送到 GitHub

```bash
git push -u origin feature/<name>
```

---

## Pull Request 與 CI 測試

### 1. 建立 Pull Request

1. 以 `feature/*`／`fix/*` 為來源、`develop` 為目標建立 PR。
2. 點擊 **Create pull request**
3. 填寫 PR 標題和描述

### 2. CI 自動執行

PR 建立後，GitHub Actions 會自動執行以下檢查：

| 檢查項目 | 說明 | 必須通過 |
|----------|------|:--------:|
| **Lint** | ESLint 程式碼風格檢查 | ✅ |
| **Type Check** | TypeScript 類型檢查 | ✅ |
| **Unit Tests** | Vitest 單元測試 | ✅ |
| **Integration Tests** | PostgreSQL 整合測試 | ✅ |
| **Build** | Next.js 建置測試 | ✅ |
| **E2E** | Playwright 端對端測試 | ✅ |

### 3. 查看 CI 狀態

- 在 PR 頁面的 **Checks** 分頁查看
- 或前往 https://github.com/hmj1026/lin_blog/actions

### 4. CI 失敗處理

如果 CI 失敗：

1. 點擊失敗的 Check 查看錯誤訊息
2. 在本地修復問題
3. 推送新 commit 到原本的 feature/fix 分支
4. CI 會自動重新執行

```bash
# 本地修復後
git add -A
git commit -m "fix: 修正 CI 錯誤"
git push origin feature/<name>
```

---

## Release 與合併到主分支

### 前提條件

- ✅ 要發布的 feature/fix 已先合併到 `develop`
- ✅ release branch 從 `develop` 建立
- ✅ 所有 CI、integration test、build 與 E2E 檢查通過
- ✅ Code Review 完成

### 合併步驟

1. 建立 `release/vX.Y.Z`，同步 `web/package.json`、`web/package-lock.json` 與 `CHANGELOG.md`。
2. 以 release branch 建立目標為 `main` 的 PR。
3. 在 PR 頁面確認 CI、E2E、Code Review 與 branch protection 全部通過。
4. 合併 PR 後建立 `vX.Y.Z` annotated tag，等待 Docker image 建置完成。
5. 依 [release.md](../release.md) 完成 GitHub Release、immutable image 部署及 `main → develop` 同步。

### 合併後自動執行

合併到 `main` 或推送版本 tag 後，會依 workflow 觸發 `docker-build.yml`：

1. 重新執行 CI 測試
2. 建置 Docker Image
3. 推送到 GitHub Container Registry (`ghcr.io`)

---

## 部署到正式伺服器

### 伺服器資訊

| 項目 | 值 |
|------|-----|
| 主機 | Linode |
| SSH 連線 | `ssh user@your-ip` |
| 專案目錄 | `/var/www/products` |
| 網站網址 | https://domain |
| CDN 網址 | https://your-cdn |

### 部署步驟

#### 方法一：使用 deploy.sh（推薦）

```bash
# 1. SSH 登入伺服器
ssh user@your-ip

# 2. 切換到 root
sudo -i

# 3. 進入專案目錄
cd /var/www/products

# 4. 執行部署腳本
BLOG_IMAGE_TAG=vX.Y.Z ./deploy.sh
```

#### 方法二：手動部署

```bash
# 1. SSH 登入
ssh user@your-ip
sudo -i

# 2. 進入專案目錄
cd /var/www/products

# 3. 指定 immutable 版本並拉取映像檔
export BLOG_IMAGE_TAG=v1.4.0
docker-compose pull

# 4. 重啟容器
docker-compose up -d

# 5. 執行資料庫遷移（如有需要）
docker exec blog_app npx prisma migrate deploy
```

### deploy.sh 腳本

正式腳本以版控中的 [`scripts/deploy.sh`](../scripts/deploy.sh) 為唯一來源，部署時必須指定版本或 commit SHA：

```bash
BLOG_IMAGE_TAG=vX.Y.Z /var/www/products/deploy.sh
```

腳本會拉取指定 image、更新容器、等待 PostgreSQL readiness、執行 migration、等待 application healthcheck，並檢查 HTTP endpoint。不要在本文件另行複製腳本內容，以免操作說明與實作漂移。

---

## 驗證與監控

### 1. 確認容器狀態

```bash
docker ps
```

預期輸出：
```
CONTAINER ID   IMAGE                              STATUS          NAMES
xxxx           ghcr.io/your-username/lin_blog:v1.4.0   Up X minutes (healthy)    blog_app
yyyy           postgres:16-alpine                 Up X minutes    blog_db
```

### 2. 查看應用程式日誌

```bash
# 查看最近日誌
docker logs blog_app --tail 100

# 即時查看日誌
docker logs -f blog_app
```

### 3. 驗證網站

- 首頁：https://domain
- 文章頁：https://domain/blog
- 管理後台：https://domain/admin

### 4. 檢查圖片 CDN

確認圖片從 CDN 載入：

```bash
curl -I https://your-cdn/uploads/sample.jpg
```

應該看到 `HTTP/2 200` 回應。

---

## 常見問題排解

### CI 失敗：TypeScript 錯誤

```bash
# 本地執行類型檢查
cd web
npx tsc --noEmit
```

根據錯誤訊息修復後重新推送。

### CI 失敗：測試失敗

```bash
# 本地執行測試
cd web
npm test
```

### CI 失敗：Build 錯誤

```bash
# 本地嘗試建置
cd web
npm run build
```

常見原因：
- 環境變數未設定（CI 需要 `NEXTAUTH_SECRET` 和 `DATABASE_URL`）
- 類型錯誤
- 缺少依賴

### 部署後網站無法存取

1. 確認容器運行中：`docker ps`
2. 查看日誌：`docker logs blog_app`
3. 確認 Nginx/Reverse Proxy 設定
4. 確認 DNS 解析正確

### 資料庫遷移失敗

```bash
# 查看遷移狀態
docker exec blog_app npx prisma migrate status

# 重置資料庫（僅限開發環境！）
docker exec blog_app npx prisma migrate reset --force
```

---

## 相關文件

- [開發環境設定](./development.md)
- [資料庫管理](./database.md)
- [CDN 與 Storage 設定](./cdn-storage.md)
- [部署指南](./deployment.md)

---

## 版本紀錄

| 日期 | 版本 | 說明 |
|------|------|------|
| 2025-12-26 | 1.0 | 初版建立 |

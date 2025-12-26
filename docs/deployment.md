# 部署指南

## 概述

本專案使用 GitHub Actions 自動建置 Docker image 並推送到 GitHub Container Registry (ghcr.io)，Linode 伺服器只需拉取預編譯的 image 即可快速部署。

## 架構流程

```
PR/Push → CI (Lint + Type Check + Test + Build) → Docker Build → ghcr.io → Linode deploy
```

### CI/CD Workflows

| Workflow | 檔案 | 觸發條件 | 功能 |
|----------|------|----------|------|
| **CI** | `ci.yml` | Push/PR to main | Lint、TypeScript、單元測試、Build |
| **E2E** | `e2e.yml` | Push/PR to main | Playwright 端對端測試 |
| **Docker Build** | `docker-build.yml` | Push to main (CI 通過後) | 建置並推送 Docker image |

---

## 🔒 Branch Protection 設定

> [!IMPORTANT]
> 建議設定 Branch Protection 強制 CI 通過才能合併 PR。

### 設定步驟

1. 前往 GitHub Repository → **Settings** → **Branches**
2. 點擊 **Add branch protection rule**
3. 設定 Branch name pattern: `main`
4. 勾選以下選項：
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
     - 搜尋並選擇：`Lint`, `Type Check`, `Unit Tests`, `Build`
   - ✅ **Require branches to be up to date before merging**
5. 點擊 **Create** 儲存

---

## ⚡ 快速更新（日常操作）

當有新版本需要部署到伺服器時，執行以下一鍵腳本：

```bash
/root/deploy.sh
```

這會完成：
1. 拉取最新 Docker image
2. 停止並更新容器
3. 執行資料庫遷移（如有）

---

## 🚀 完整部署步驟

### 1. 開發端推送

```bash
# 推送到 main 分支觸發自動建置
git push origin main
```

> 💡 GitHub Actions 會自動建置 Docker image 並推送到 `ghcr.io/hmj1026/lin_blog:latest`

### 2. 伺服器端更新

#### 方式一：使用部署腳本（推薦）

```bash
ssh root@your-server-ip
/root/deploy.sh
```

#### 方式二：手動執行

```bash
# SSH 到伺服器
ssh root@your-server-ip

# 拉取最新 image
docker pull ghcr.io/hmj1026/lin_blog:latest

# 進入專案目錄
cd /path/to/lin_blog

# 重啟容器
docker-compose down
docker-compose up -d

# 執行資料庫遷移（如有 schema 變更）
docker exec blog_app npx prisma migrate deploy
```

### 3. 驗證部署

```bash
# 檢查容器狀態
docker ps | grep blog

# 查看即時日誌
docker logs -f blog_app

# 測試 API 回應
curl -I http://localhost:3100
```

---

## 📋 首次部署（伺服器設定）

### 1. 設定 GitHub Container Registry (ghcr.io)

> [!NOTE]
> ghcr.io 是 GitHub 內建的 Container Registry，無需額外註冊。
> GitHub Actions 會自動使用 `GITHUB_TOKEN` 推送 image，無需手動設定。

#### 1.1 建立 Personal Access Token（用於伺服器拉取）

1. 前往 GitHub → **Settings** → **Developer settings**
2. 點擊 **Personal access tokens** → **Tokens (classic)**
3. 點擊 **Generate new token (classic)**
4. 設定：
   - **Note**: `linode-docker-pull`
   - **Expiration**: 選擇適當期限或 No expiration
   - **Scopes**: 勾選 `read:packages`
5. 點擊 **Generate token** 並複製 token（只會顯示一次）

#### 1.2 在伺服器登入 ghcr.io

```bash
# 將 YOUR_TOKEN 替換為上一步複製的 token
# 將 YOUR_GITHUB_USERNAME 替換為您的 GitHub 使用者名稱
echo YOUR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

驗證登入成功：
```bash
docker pull ghcr.io/hmj1026/lin_blog:latest
```

#### 1.3 查看已推送的 Images

推送成功後，可在以下位置查看：
- GitHub Repository → **Packages** 標籤頁
- 直接訪問：`https://github.com/hmj1026/lin_blog/pkgs/container/lin_blog`

### 2. Clone 專案並設定環境

```bash
cd /root
git clone https://github.com/hmj1026/lin_blog.git
cd lin_blog

# 確認使用 main 分支（如舊版使用 master 需切換）
git checkout main
git branch -u origin/main main

# 複製並編輯環境變數
cp .env.production.example .env
nano .env
```

> ⚠️ **注意**：如果伺服器舊版本使用 `master` 分支，需要執行以下切換：
> ```bash
> git fetch origin
> git checkout main
> git branch -D master  # 刪除舊的 master 分支
> ```

### 3. 建立必要網路

```bash
docker network create srl_shared_network
```

### 4. 首次啟動

```bash
docker-compose up -d

# 執行資料庫初始化
docker exec blog_app npx prisma migrate deploy

# 建立管理員帳號
docker exec -it blog_app node scripts/create-user.js \
  --email admin@example.com \
  --password your-secure-password \
  --name Admin
```

### 5. 建立部署腳本

建立 `/root/deploy.sh`：

```bash
#!/bin/bash
set -e

echo "🚀 開始部署..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"

# 拉取最新 image
docker pull ghcr.io/hmj1026/lin_blog:latest

# 重啟容器
cd /root/lin_blog
docker-compose down
docker-compose up -d

# 等待容器啟動
sleep 5

# 執行遷移
docker exec blog_app npx prisma migrate deploy

# 健康檢查
if curl -sf http://localhost:3100 > /dev/null; then
    echo "✅ 部署完成！"
else
    echo "❌ 健康檢查失敗，請檢查日誌"
    docker logs --tail 50 blog_app
    exit 1
fi
```

設定權限：
```bash
chmod +x /root/deploy.sh
```

---

## 🏷️ Image 標籤說明

| 標籤 | 說明 | 使用場景 |
|-----|------|---------|
| `latest` | main 分支最新版本 | 日常部署 |
| `main` | main 分支別名 | 同上 |
| `sha-xxxxxx` | 特定 commit 版本 | 回滾使用 |

---

## 🔄 回滾操作

```bash
# 查看可用版本
docker images ghcr.io/hmj1026/lin_blog

# 使用特定版本回滾
docker pull ghcr.io/hmj1026/lin_blog:sha-abc1234
cd /root/lin_blog
docker-compose down
docker-compose up -d
```

---

## 🔧 監控與除錯

### 日誌查看

```bash
# 即時日誌
docker logs -f blog_app

# 最近 100 行
docker logs --tail 100 blog_app

# 特定時間範圍
docker logs --since 1h blog_app
```

### 進入容器

```bash
docker exec -it blog_app sh
```

### 資料庫操作

```bash
# 連接資料庫
docker exec -it blog_db psql -U blog_user -d lin_blog

# 備份資料庫
docker exec blog_db pg_dump -U blog_user lin_blog > backup_$(date +%Y%m%d).sql
```

### 容器狀態

```bash
# 查看資源使用
docker stats blog_app blog_db

# 檢查容器健康
docker inspect blog_app --format='{{.State.Health.Status}}'
```

---

## 📁 環境變數說明

| 變數 | 說明 | 必填 |
|------|------|:----:|
| `DATABASE_URL` | PostgreSQL 連線字串 | ✅ |
| `NEXTAUTH_SECRET` | 認證密鑰（32字元以上） | ✅ |
| `NEXTAUTH_URL` | 網站完整 URL | ✅ |
| `NEXT_PUBLIC_SITE_URL` | 前端網站 URL | ✅ |
| `BLOG_PORT` | 對外 Port（預設 3100） | ❌ |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | ❌ |

完整範例見：[.env.production.example](../.env.production.example)

---

## ☁️ CDN 與 Storage 設定（選用）

> [!TIP]
> 使用 Cloudflare R2 + CDN 可達到**零流量成本**，推薦生產環境使用。

### Storage 類型

| 類型 | `NEXT_PUBLIC_UPLOAD_BASE_URL` | 說明 |
|------|-------------------------------|------|
| **Local Storage** | 不設定（使用相對路徑） | 圖片檔案存在容器內，透過 `/api/files/...` 存取 |
| **R2 + CDN** | `https://cdn.yourdomain.com` | 圖片存在 Cloudflare R2，透過 CDN 存取 |

### 快速設定 (R2)

1. **建立 R2 Bucket** - 在 Cloudflare Dashboard 建立
2. **建立 API Token** - 取得 Access Key 和 Endpoint
3. **設定公開存取** - 使用 Custom Domain 或 R2.dev
4. **設定環境變數**：

```env
STORAGE_PROVIDER=r2
STORAGE_BUCKET=lin-blog-uploads
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ACCESS_KEY_ID=your-access-key-id
STORAGE_SECRET_ACCESS_KEY=your-secret-access-key
NEXT_PUBLIC_UPLOAD_BASE_URL=https://uploads.yourdomain.com
```

📖 **完整設定步驟請參閱**：[CDN 與 Storage 架構指南](cdn-storage.md)

## 🔗 延伸閱讀

- [CDN 與 Storage 架構指南](cdn-storage.md) - 流量成本優化與 CDN 設定
- [資料庫設定指南](database.md) - PostgreSQL 設定與維護
- [本地開發環境](development.md) - 開發環境設定

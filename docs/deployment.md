# 部署指南

## 概述

本專案使用 GitHub Actions 自動建置 Docker image 並推送到 GitHub Container Registry (ghcr.io)，Linode 伺服器只需拉取預編譯的 image 即可快速部署。

## 架構流程

```
Push to main → GitHub Actions 建置 → ghcr.io → Linode docker pull
```

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

### 1. 登入 GitHub Container Registry

```bash
# 建立 Personal Access Token (read:packages 權限)
# GitHub → Settings → Developer settings → Personal access tokens

echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

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

## 🔗 延伸閱讀

- [CDN 與 Storage 架構指南](cdn-storage.md) - 流量成本優化與 CDN 設定
- [資料庫設定指南](database.md) - PostgreSQL 設定與維護
- [本地開發環境](development.md) - 開發環境設定

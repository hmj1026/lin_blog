# 部署指南

## 概述

本專案使用 GitHub Actions 自動建置 Docker image 並推送到 GitHub Container Registry (ghcr.io)，Linode 伺服器只需拉取預編譯的 image 即可快速部署。

## 架構流程

```
Push to main → GitHub Actions 建置 → ghcr.io → Linode docker pull
```

## 自動建置觸發條件

- 推送到 `main` 分支
- 手動觸發 (workflow_dispatch)

## Linode 部署步驟

### 1. 首次設定（僅需一次）

```bash
# 登入 GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

> 📝 **取得 Token**: GitHub → Settings → Developer settings → Personal access tokens → 勾選 `read:packages`

### 2. 拉取最新 Image

```bash
docker pull ghcr.io/hmj1026/lin_blog:latest
```

### 3. 更新容器

```bash
cd /path/to/lin_blog
docker-compose down
docker-compose up -d
```

### 4. 執行資料庫遷移（如有需要）

```bash
docker exec lin_blog_app npx prisma migrate deploy
```

## 一鍵部署腳本

建立 `/root/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 開始部署..."

# 拉取最新 image
docker pull ghcr.io/hmj1026/lin_blog:latest

# 重啟容器
cd /path/to/lin_blog
docker-compose down
docker-compose up -d

# 執行遷移
docker exec lin_blog_app npx prisma migrate deploy

echo "✅ 部署完成！"
```

使用方式:
```bash
chmod +x /root/deploy.sh
/root/deploy.sh
```

## Image 標籤說明

| 標籤 | 說明 |
|-----|------|
| `latest` | main 分支最新版本 |
| `main` | main 分支別名 |
| `sha-xxxxxx` | 特定 commit 版本 |

## 回滾操作

```bash
# 查看可用版本
docker images ghcr.io/hmj1026/lin_blog

# 使用特定版本
docker pull ghcr.io/hmj1026/lin_blog:sha-abc1234
```

## 監控與除錯

```bash
# 查看容器日誌
docker logs -f lin_blog_app

# 進入容器
docker exec -it lin_blog_app sh
```

## 延伸閱讀

- [CDN 與 Storage 架構指南](cdn-storage.md) - 流量成本優化與 CDN 設定

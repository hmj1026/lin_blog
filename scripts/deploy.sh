#!/usr/bin/env bash
# ===================================================
# lin_blog 一鍵部署腳本（正式主機）
# ---------------------------------------------------
# 部署位置（伺服器）：/var/www/products/deploy.sh
# 版控來源：           scripts/deploy.sh
#
# 主機僅安裝 docker-compose v1（1.29.x），故一律使用 `docker-compose`（連字號）。
# 用法：
#   ./deploy.sh                # 部署 latest
#   BLOG_IMAGE_TAG=sha-abc123 ./deploy.sh   # 部署 / 回滾指定版本
# ===================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/products/lin_blog}"
IMAGE="ghcr.io/hmj1026/lin_blog"
TAG="${BLOG_IMAGE_TAG:-latest}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3100}"

echo "🚀 開始部署 lin_blog"
echo "📅 $(date '+%Y-%m-%d %H:%M:%S')"
echo "📦 image: ${IMAGE}:${TAG}"

cd "$PROJECT_DIR"

# 1. 拉取指定版本 image
docker pull "${IMAGE}:${TAG}"

# 2. 以指定 tag 重啟容器（BLOG_IMAGE_TAG 供 docker-compose.yml 內插）
export BLOG_IMAGE_TAG="$TAG"
docker-compose down
docker-compose up -d --remove-orphans

# 3. 等待容器啟動
sleep 5

# 4. 執行資料庫遷移（如有 schema 變更）
docker exec blog_app node node_modules/prisma/build/index.js migrate deploy

# 5. 健康檢查
if curl -sf "$HEALTH_URL" >/dev/null; then
    echo "✅ 部署完成！（${IMAGE}:${TAG}）"
else
    echo "❌ 健康檢查失敗（${HEALTH_URL}），輸出最近日誌："
    docker logs --tail 50 blog_app || true
    exit 1
fi

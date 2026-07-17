#!/usr/bin/env bash
# ===================================================
# lin_blog 一鍵部署腳本（正式主機）
# ---------------------------------------------------
# 部署位置（伺服器）：/var/www/products/deploy.sh
# 版控來源：           scripts/deploy.sh
#
# 主機僅安裝 docker-compose v1（1.29.x），故一律使用 `docker-compose`（連字號）。
# 用法：
#   BLOG_IMAGE_TAG=v1.4.0 ./deploy.sh       # 部署版本 image
#   BLOG_IMAGE_TAG=f08e7b7 ./deploy.sh      # 部署 / 回滾指定 commit image
# ===================================================
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/var/www/products/lin_blog}"
IMAGE="ghcr.io/hmj1026/lin_blog"
TAG="${BLOG_IMAGE_TAG:?BLOG_IMAGE_TAG must be set to an immutable version or SHA tag}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3100}"

if [[ ! "$TAG" =~ ^(v?[0-9]+\.[0-9]+\.[0-9]+|sha-[0-9a-f]{7,40}|[0-9a-f]{7,40})$ ]]; then
  echo "BLOG_IMAGE_TAG must be a semantic version or commit SHA: ${TAG}" >&2
  exit 1
fi

echo "開始部署 lin_blog"
echo "$(date '+%Y-%m-%d %H:%M:%S')"
echo "image: ${IMAGE}:${TAG}"

cd "$PROJECT_DIR"

# 1. 拉取指定版本 image
docker pull "${IMAGE}:${TAG}"

# 1b. RepoDigest preflight（upgrade-nextjs-16 §6.2）：
#     APPROVED_REPO_DIGEST 為 verification manifest 核准的 immutable digest
#     （格式 sha256:...）。pull 後、停掉舊服務前比對實際 RepoDigest，
#     mismatch 必須在 down 之前失敗，避免以未經核准的 artifact 替換服務。
if [[ -n "${APPROVED_REPO_DIGEST:-}" ]]; then
  actual_digest="$(docker inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "${IMAGE}:${TAG}" \
    | grep -F "${IMAGE}@" | head -1 | cut -d@ -f2 || true)"
  if [[ -z "$actual_digest" ]]; then
    echo "RepoDigest preflight failed: cannot resolve digest for ${IMAGE}:${TAG}" >&2
    exit 1
  fi
  if [[ "$actual_digest" != "$APPROVED_REPO_DIGEST" ]]; then
    echo "RepoDigest preflight failed:" >&2
    echo "  approved: ${APPROVED_REPO_DIGEST}" >&2
    echo "  actual:   ${actual_digest}" >&2
    exit 1
  fi
  echo "RepoDigest preflight OK: ${actual_digest}"
else
  echo "WARN: APPROVED_REPO_DIGEST not set; skipping digest preflight（僅限非正式流程）" >&2
fi

# 2. 以指定 tag 重啟容器（BLOG_IMAGE_TAG 供 docker-compose.yml 內插）
export BLOG_IMAGE_TAG="$TAG"
docker-compose down
docker-compose up -d --remove-orphans

# 3. 等待 PostgreSQL readiness（不使用固定 sleep 取代檢查）
for attempt in {1..30}; do
  if docker-compose exec -T postgres pg_isready -q; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "PostgreSQL readiness check failed" >&2
    docker-compose logs --tail 50 postgres || true
    exit 1
  fi
  sleep 2
done

# 4. 執行資料庫遷移（如有 schema 變更）
docker exec blog_app node node_modules/prisma/build/index.js migrate deploy

# 5. 等待應用程式 healthcheck
for attempt in {1..30}; do
  status="$(docker inspect --format '{{.State.Health.Status}}' blog_app 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  if [[ "$status" == "unhealthy" || "$attempt" -eq 30 ]]; then
    echo "Application healthcheck failed (status: ${status:-unknown})" >&2
    docker logs --tail 50 blog_app || true
    exit 1
  fi
  sleep 2
done

# 6. 外部 endpoint 健康檢查
if curl -sf "$HEALTH_URL" >/dev/null; then
    echo "部署完成（${IMAGE}:${TAG}）"
else
    echo "健康檢查失敗（${HEALTH_URL}），輸出最近日誌：" >&2
    docker logs --tail 50 blog_app || true
    exit 1
fi

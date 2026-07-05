#!/usr/bin/env bash
# ===================================================
# lin_blog PostgreSQL 每日備份腳本
# ---------------------------------------------------
# 目前伺服器「沒有」任何自動 DB 備份，本腳本補上此缺口。
#
# 部署位置（伺服器）：/var/www/products/backup-db.sh
# 版控來源：           scripts/backup-db.sh
#
# 安裝每日 cron（root）：
#   sudo crontab -l           # 先確認無既有備份排程
#   sudo crontab -e
#   # 每日 03:00 備份，日誌寫入 /var/log/lin_blog-backup.log
#   0 3 * * * /var/www/products/backup-db.sh >> /var/log/lin_blog-backup.log 2>&1
#
# 還原（restore）：
#   # 解壓後灌回（會覆蓋現有資料，請先確認）
#   gunzip -c /var/backups/lin_blog/lin_blog_YYYYMMDD_HHMMSS.sql.gz \
#     | docker exec -i blog_db psql -U blog_user -d lin_blog
# ===================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/lin_blog}"
DB_USER="${POSTGRES_USER:-blog_user}"
DB_NAME="${POSTGRES_DB:-lin_blog}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"   # 保留天數

# 自動偵測 DB 容器名（正式主機上的容器曾被改名為 <hash>_blog_db）
DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E '(^|_)blog_db$' | head -n1 || true)"
if [[ -z "$DB_CONTAINER" ]]; then
    echo "❌ 找不到執行中的 blog_db 容器（docker ps）" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date '+%Y%m%d_%H%M%S')"
OUT="${BACKUP_DIR}/${DB_NAME}_${STAMP}.sql.gz"

echo "🗄️  備份 ${DB_NAME}（容器 ${DB_CONTAINER}）→ ${OUT}"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUT"

# 驗證備份非空
if [[ ! -s "$OUT" ]]; then
    echo "❌ 備份檔為空，請檢查：${OUT}" >&2
    exit 1
fi

# 輪替：刪除超過保留天數的舊備份
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "✅ 備份完成（$(du -h "$OUT" | cut -f1)），保留 ${RETENTION_DAYS} 天"

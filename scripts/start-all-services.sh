#!/usr/bin/env bash
# ===================================================
# 開機啟動腳本（WordPress / n8n 下線後版本）
# ---------------------------------------------------
# 部署位置（伺服器）：/var/www/products/start-all-services.sh
# 版控來源：           scripts/start-all-services.sh
#
# WordPress（SrLWordpress）與 n8n（SrLN8n）已下線移除，本機僅剩 lin_blog。
# 反向代理由主機層 systemd nginx 提供（隨系統啟動），不需在此處理。
#
# 安裝為開機自動啟動（root crontab）：
#   sudo crontab -e
#   @reboot sleep 30 && /var/www/products/start-all-services.sh >> /var/log/startup.log 2>&1
# ===================================================
set -euo pipefail

echo "▶️  啟動 lin_blog  $(date '+%Y-%m-%d %H:%M:%S')"
cd /var/www/products/lin_blog
docker-compose up -d

echo "✅ 完成，容器狀態："
docker-compose ps

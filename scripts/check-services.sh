#!/usr/bin/env bash
# ===================================================
# lin_blog 服務健檢腳本
# ---------------------------------------------------
# 部署位置（伺服器）：/var/www/products/check-services.sh
# 版控來源：           scripts/check-services.sh
#
# 檢查：容器狀態、對外埠曝露（安全）、HTTP 回應、憑證到期日。
# ===================================================
set -uo pipefail

echo "===== 容器狀態 ====="
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'NAMES|blog_' || echo "（無 blog 容器）"

echo
echo "===== 監聽埠（安全檢查）====="
echo "期望：3100 對外；5432 僅 127.0.0.1；不應再有 5678/9001/9002"
if command -v ss >/dev/null; then
    ss -tlnp 2>/dev/null | grep -E ':(3100|5432|5678|9001|9002)\b' || echo "（無相符監聽埠）"
else
    netstat -tlnp 2>/dev/null | grep -E ':(3100|5432|5678|9001|9002)\b' || echo "（無相符監聽埠）"
fi

echo
echo "===== HTTP 健檢 ====="
for url in http://localhost:3100 https://linstar.win https://nx.linstar.win; do
    code="$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "$url" || echo 000)"
    echo "  ${url} → ${code}"
done

echo
echo "===== TLS 憑證到期 ====="
if [[ -f /etc/letsencrypt/live/linstar.win/fullchain.pem ]]; then
    openssl x509 -enddate -noout -in /etc/letsencrypt/live/linstar.win/fullchain.pem
else
    echo "（找不到 /etc/letsencrypt/live/linstar.win/fullchain.pem）"
fi

echo
echo "===== 記憶體 ====="
free -m | grep -E 'Mem|total'

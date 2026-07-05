#!/usr/bin/env bash
# ===================================================
# 手動觸發 Let's Encrypt 憑證續期（正式主機）
# ---------------------------------------------------
# 部署位置（伺服器）：/var/www/products/renew-ssl.sh
# 版控來源：           scripts/renew-ssl.sh
#
# 平時續期為全自動：certbot.timer（每日兩次）+ dns-cloudflare +
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh（續期後自動 reload 主機 nginx）。
# 本腳本僅供「手動強制續期 / 排查」時使用。
#
# ⚠️ 舊版（WordPress 時代）會把憑證 cp 到 SrLWordpress/nginx/certs 並 `docker exec wp_nginx
# nginx -s reload`——WordPress 已下線、wp_nginx 不存在，那套流程已失效。現行反向代理為
# 主機層 systemd nginx，直接讀 /etc/letsencrypt/live/linstar.win/，reload 主機 nginx 即可。
# ===================================================
set -euo pipefail

echo "========== SSL 憑證手動續期 =========="
echo "時間：$(date)"

echo ""
echo "1. 目前憑證狀態"
sudo certbot certificates

echo ""
echo "2. 執行續期（未到期會顯示 not due；加 --force-renewal 可強制）"
sudo certbot renew

echo ""
echo "3. 測試並 reload 主機 nginx"
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "4. 驗證線上憑證日期"
echo | openssl s_client -servername linstar.win -connect linstar.win:443 2>/dev/null \
  | openssl x509 -noout -dates

echo ""
echo "========== 完成 =========="

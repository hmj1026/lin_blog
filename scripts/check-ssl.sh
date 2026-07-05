#!/usr/bin/env bash
# ===================================================
# SSL 憑證狀態檢查（線上實測各網域）
# ---------------------------------------------------
# 部署位置（伺服器）：/var/www/products/check-ssl.sh
# 版控來源：           scripts/check-ssl.sh
#
# 對每個網域用 openssl s_client 實測「線上實際送的憑證」到期日。
# 網域：apex linstar.win 與 nx.linstar.win（皆導向 lin_blog）；n8n 已下線移除。
# ===================================================

echo "========== SSL 憑證狀態 =========="
echo ""

for domain in linstar.win nx.linstar.win; do
    echo -n "$domain: "
    expiry=$(echo | openssl s_client -servername "$domain" -connect "$domain":443 2>/dev/null \
        | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$expiry" ]; then
        expiry_epoch=$(date -d "$expiry" +%s)
        now_epoch=$(date +%s)
        days_left=$(( (expiry_epoch - now_epoch) / 86400 ))
        if [ "$days_left" -lt 14 ]; then
            echo "⚠️ 剩餘 $days_left 天 (到期: $expiry)"
        else
            echo "✅ 剩餘 $days_left 天 (到期: $expiry)"
        fi
    else
        echo "❌ 無法檢查"
    fi
done

#!/usr/bin/env bash
# ===================================================
# Fail2ban 健康檢查 / 封鎖統計
# ---------------------------------------------------
# 部署位置（伺服器）：/var/www/products/fail2ban_stats.sh
# 版控來源：           scripts/fail2ban_stats.sh
#
# 動態讀取 jail 清單，WordPress 下線後仍可用（jail.local 內殘留的
# nginx-wordpress / nginx-wplogin jail 若不再需要，可另於 jail.local 移除，非本腳本問題）。
# ===================================================

echo "========== Fail2ban 健康檢查 =========="
echo ""

echo "1. 服務狀態:"
sudo systemctl status fail2ban --no-pager | head -5

echo ""
echo "2. Jail 總覽:"
sudo fail2ban-client status

echo ""
echo "3. 各 Jail 封鎖統計:"
for jail in $(sudo fail2ban-client status | grep "Jail list" | sed 's/.*://;s/,//g'); do
  banned=$(sudo fail2ban-client status "$jail" | grep "Currently banned" | awk '{print $4}')
  total=$(sudo fail2ban-client status "$jail" | grep "Total banned" | awk '{print $4}')
  echo "   $jail: 目前封鎖 $banned，累計 $total"
done

echo ""
echo "4. 最近封鎖動作:"
sudo tail -10 /var/log/fail2ban.log | grep -E "Ban|Unban|WARNING"

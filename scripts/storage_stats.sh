#!/usr/bin/env bash
# ===================================================
# 硬碟 / Docker 容量檢查
# ---------------------------------------------------
# 部署位置（伺服器）：/var/www/products/storage_stats.sh
# 版控來源：           scripts/storage_stats.sh
# ===================================================

echo "========== 硬碟容量檢查 =========="
echo ""
echo "1. 整體使用量:"
df -h / | awk 'NR==2 {print "   總容量: "$2"  已使用: "$3"  剩餘: "$4"  使用率: "$5}'
echo ""
echo "2. Docker 使用量:"
docker system df 2>/dev/null || echo "   Docker 未安裝"
echo ""
echo "3. 日誌檔案大小:"
sudo du -sh /var/log 2>/dev/null
echo ""
echo "========== 檢查完成 =========="

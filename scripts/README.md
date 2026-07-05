# scripts/ — 伺服器維運腳本（版控 SSOT）

這些是正式主機的維運腳本，過去只散落在伺服器上（`/var/www/products/`、`/root/`），
現納入版控作為單一真實來源（SSOT）。搬遷或重建主機時可直接複製使用。

> 前提：正式主機僅安裝 **`docker-compose` v1**（1.29.x），所有腳本一律使用連字號
> `docker-compose`；lin_blog 部署於 `/var/www/products/lin_blog`，SSH 使用者 `paul`。
> 腳本本身不含任何機密。

| 腳本 | 用途 |
|------|------|
| `deploy.sh` | 一鍵部署 / 回滾：pull image → `docker-compose up -d` → prisma migrate → 健檢。支援 `BLOG_IMAGE_TAG`。 |
| `backup-db.sh` | PostgreSQL 每日備份（gzip + 保留輪替），含 restore 說明。**補上目前缺少的自動 DB 備份。** |
| `start-all-services.sh` | 開機啟動（WP/n8n 下線後僅啟 lin_blog），供 `@reboot` cron。 |
| `check-services.sh` | 健檢：容器狀態、埠曝露、HTTP、憑證到期、記憶體。 |
| `check-ssl.sh` | 線上實測各網域（apex + nx）憑證到期日。 |
| `renew-ssl.sh` | 手動強制續期 + reload 主機 nginx（平時 certbot.timer 自動；舊 WP 流程已修正）。 |
| `fail2ban_stats.sh` | fail2ban 服務狀態與各 jail 封鎖統計。 |
| `storage_stats.sh` | 磁碟 / Docker / 日誌用量。 |

## 安裝到伺服器

```bash
cd /var/www/products/lin_blog
sudo cp scripts/deploy.sh scripts/backup-db.sh scripts/start-all-services.sh \
        scripts/check-services.sh scripts/check-ssl.sh scripts/renew-ssl.sh \
        scripts/fail2ban_stats.sh scripts/storage_stats.sh /var/www/products/
sudo chmod +x /var/www/products/{deploy,backup-db,start-all-services,check-services,check-ssl,renew-ssl,fail2ban_stats,storage_stats}.sh
```

## 安裝 cron（root）

```bash
# 先確認目前排程（尤其是否已有 DB 備份）
sudo crontab -l -u root
ls -la /etc/cron.d/

# 加入排程
sudo crontab -e
```

```cron
# 每日 03:00 備份 lin_blog 資料庫
0 3 * * * /var/www/products/backup-db.sh >> /var/log/lin_blog-backup.log 2>&1

# 開機自動啟動 lin_blog
@reboot sleep 30 && /var/www/products/start-all-services.sh >> /var/log/startup.log 2>&1
```

## 資料庫還原

```bash
# 角色/DB 名以容器內環境為準（此部署為 develop / lin_blog）
gunzip -c /var/backups/lin_blog/lin_blog_YYYYMMDD_HHMMSS.sql.gz \
  | docker exec -i blog_db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

> 相關文件：[部署指南](../docs/deployment.md)、搬遷手冊 `docs/private/migration-runbook.md`（本機限定）。

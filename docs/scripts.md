# Lin Blog 維運與管理腳本指南

本文件詳列 Lin Blog 專案中所有的維運、管理與自動化腳本。腳本主要分為兩大類：位於 `web/scripts/` 的 **「後台應用管理腳本」**，以及位於 `/scripts` 的 **「伺服器端系統維運腳本」**。

---

## 1. 後台應用管理腳本 (web/scripts/)

這些是基於 Node.js / TypeScript 撰寫的腳本，用於開發環境或容器內部，執行資料庫初始化、使用者管理與儲存體遷移。

### 1.1 `init-admin.js` — 系統初始化
- **用途**：首次部署時執行，以冪等（Idempotent）方式建立系統預設的角色（`ADMIN`、`EDITOR`、`READER`）、全站權限清單、預設的分類以及首頁的基本站點設定。
- **執行方式**：
  ```bash
  # 本地開發
  cd web && node scripts/init-admin.js
  
  # Docker 容器內
  docker exec blog_app node scripts/init-admin.js
  ```
- **安全說明**：此腳本僅建立架構基礎資料與設定，不會建立任何使用者帳號，重複執行安全。

### 1.2 `create-user.js` — 建立使用者
- **用途**：在資料庫中建立新的管理員或編輯者帳號，密碼會自動經 bcrypt 哈希加密儲存。
- **必要環境變數**：
  - `ADMIN_PASSWORD`：要設定的密碼（長度至少 6 個字元）。
- **參數說明**：
  - `--email` (必填)：使用者 Email 帳號。
  - `--name` (選填)：使用者顯示名稱。
  - `--role` (選填)：使用者角色，預設為 `ADMIN`（可選 `ADMIN`、`EDITOR`、`READER` 或自訂角色）。
- **執行方式**：
  ```bash
  ADMIN_PASSWORD=your-password-here node scripts/create-user.js \
    --email="admin@example.com" \
    --name="管理員" \
    --role="ADMIN"
  ```

### 1.3 `migrate-storage.js` — 媒體儲存體遷移
- **用途**：將原本儲存在本機硬碟（`local` 儲存體）的媒體檔案遷移上傳至雲端 Storage 物件儲存服務（如 Cloudflare R2, AWS S3 或 Google Cloud GCS）。
- **參數說明**：
  - `--dry-run`：預覽遷移流程與檔案清單，不實際執行上傳。
  - `--force`：若目標雲端儲存體已存在同名檔案，強制覆蓋上傳。
- **執行方式**：
  ```bash
  # 預覽遷移
  node scripts/migrate-storage.js --dry-run
  
  # 執行遷移
  node scripts/migrate-storage.js
  ```
- **安全說明**：遷移前請確認 `.env` 中的 `STORAGE_PROVIDER` 已切換為雲端設定，並填妥對應的 Access Key、Secret 等金鑰。

### 1.4 `generate-secret.js` — 產生認證金鑰
- **用途**：快速產生一組符合強度要求的 32 位元隨機 Base64 金鑰，供 NextAuth 服務加密 session 會話使用（對接 `.env` 中的 `NEXTAUTH_SECRET`）。
- **執行方式**：
  ```bash
  node scripts/generate-secret.js
  ```

### 1.5 `check-users.ts` — 使用者狀態檢查
- **用途**：以 TypeScript 撰寫，快速查詢當前資料庫中的使用者總數、管理員帳號狀態與角色對應，防範意外將最後管理者停用。
- **執行方式**：
  ```bash
  npx ts-node scripts/check-users.ts
  ```

---

## 2. 伺服器端系統維運腳本 (/scripts/)

這些是 Shell 腳本，用於正式主機的系統維運、自動備份、SSL 憑證續期及安全防護統計。

### 2.1 `deploy.sh` — 一鍵部署與回滾
- **用途**：正式環境的自動化部署腳本。主要流程包括：
  1. 檢查是否傳入指定的 `BLOG_IMAGE_TAG`。
  2. 拉取指定的 Docker Image。
  3. 重啟容器服務。
  4. 執行資料庫遷移（`prisma migrate deploy`）。
  5. 執行健康檢查（Readiness Check）確認新版本正常運作。
- **執行方式**：
  ```bash
  BLOG_IMAGE_TAG=v1.5.0 ./deploy.sh
  ```

### 2.2 `backup-db.sh` — 資料庫每日自動備份
- **用途**：以 `pg_dump` 將 PostgreSQL 資料庫備份為 `.sql.gz` 壓縮檔，並保留近期的備份檔案，自動清理逾期備份。
- **執行方式**：
  ```bash
  ./backup-db.sh
  ```
- **還原指令參考**：
  ```bash
  gunzip -c /var/backups/lin_blog/lin_blog_YYYYMMDD_HHMMSS.sql.gz \
    | docker exec -i blog_db sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  ```

### 2.3 `start-all-services.sh` — 開機自啟動
- **用途**：用於 Linux 系統重啟後的自啟動掛載，會自動檢查並啟動 `lin_blog` 的 Docker 容器。
- **設定方式**：一般掛載於 crontab 的 `@reboot` 事件。

### 2.4 `check-services.sh` — 系統健檢
- **用途**：全面檢查伺服器健康狀態，包括：
  - 容器執行狀態與資源用量。
  - 伺服器連接埠曝露情形。
  - HTTP 回應碼與 SSL 憑證到期日。
  - 主機剩餘記憶體與硬碟空間。
- **執行方式**：
  ```bash
  ./check-services.sh
  ```

### 2.5 `renew-ssl.sh` & `check-ssl.sh` — 憑證管理
- **用途**：
  - `check-ssl.sh`：實測並回傳當前所有綁定網域的 SSL 憑證剩餘有效天數。
  - `renew-ssl.sh`：手動強制續期 Certbot 憑證，並自動 reload 主機 Nginx 服務載入新憑證。
- **執行方式**：
  ```bash
  ./check-ssl.sh
  ./renew-ssl.sh
  ```

### 2.6 `fail2ban_stats.sh` — 安全防禦統計
- **用途**：查詢 fail2ban 服務狀態，並分析顯示各個防護 Jail（如 sshd, nginx 等）封鎖的惡意 IP 數量與統計。
- **執行方式**：
  ```bash
  ./fail2ban_stats.sh
  ```

### 2.7 `storage_stats.sh` — 磁碟與日誌分析
- **用途**：分析伺服器各分區的硬碟空間、Docker 儲存捲用量，以及系統日誌檔案佔用的體積，協助排查硬碟爆滿問題。
- **執行方式**：
  ```bash
  ./storage_stats.sh
  ```

### 2.8 `verify-runtime-contract.sh` — 執行期合約校驗
- **用途**：驗證部署環境的配置是否符合合約要求（如 API 回應、環境變數宣告等），通常作為 CI/CD 自動化流程的一部分。
- **執行方式**：
  ```bash
  ./verify-runtime-contract.sh
  ```

---

## 3. 正式主機 Crontab 自動化排程設定

為確保系統穩定，應將備份與啟動腳本寫入 root 使用者的排程：

```bash
# 編輯 root 的 crontab 排程
sudo crontab -e
```

**推薦配置：**
```cron
# 每日凌晨 03:00 自動備份資料庫並壓縮存檔
0 3 * * * /var/www/products/backup-db.sh >> /var/log/lin_blog-backup.log 2>&1

# 開機重啟後延遲 30 秒自動掛載並啟動服務
@reboot sleep 30 && /var/www/products/start-all-services.sh >> /var/log/startup.log 2>&1
```

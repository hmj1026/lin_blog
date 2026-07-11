# Newsletter 訂閱者資料回滾 Runbook

適用範圍：`add-reader-discovery-and-subscriptions` change 新增的 `Subscriber` table
（migration `20260710144200_add_subscriber`）與相關公開訂閱功能。本文件依 `design.md`
Migration Plan 第 5–6 步撰寫，分階段執行，**預設不刪除資料庫資料**，只有在明確的人工決策
與備份/個資交接確認後，才執行最後一階段的 drop-table 回滾。

## 回滾原則

- Additive migration（只新增 table，未修改既有 Post/User/Analytics/SiteSetting 等 model）
  代表舊版應用程式可以安全地忽略 `Subscriber` table 繼續運作，**不需要**回滾資料庫就能
  回滾應用程式版本。
- 因此預設回滾策略是「只回退程式，保留資料表」；drop-table 是最後手段，且需要獨立審批。
- 任何階段都 **不得** 對正式環境資料庫（`lin_blog`）直接執行本文件中的 DROP/DELETE 語句，
  除非已完成備份、個資交接與人工核准。所有指令範例中的資料庫連線字串僅供示意，正式執行前
  必須確認目標資料庫名稱正確。

## 階段 1：停用公開寫入入口並回退應用版本

1. 停用或移除前台訂閱表單入口與公開 API route（`/api/newsletter/subscribe`），避免回退期間
   仍有新請求寫入即將回退的程式路徑。
2. 依一般部署流程回退應用程式版本（例如重新部署前一個 release tag / commit）。
3. 確認回退後的健康檢查、既有文章與後台功能皆正常。
4. `Subscriber` table 仍存在於資料庫；因為是 additive schema，舊版應用程式不會查詢或依賴
   這張表，不受影響。

此階段結束即完成「預設回滾」——資料庫維持不變，僅程式版本回退。

## 階段 2（預設）：保留 additive Subscriber table

- 除非有明確的法規要求或人工決策要求連資料庫一併回滾，否則回滾流程到階段 1 為止即可。
- 保留 table 可避免已收集的訂閱資料遺失，且不影響回退後的舊版程式運作。
- 若之後要重新上線訂閱功能，只需重新部署新版應用程式，無需任何額外 migration。

## 階段 3（僅限已核准的個資回滾）：drop-table 回滾

**執行前置條件（缺一不可）：**

1. 已完成訂閱資料備份，備份存放於符合公司資料保護政策的儲存位置（不得寫入 git repo 或一般
   部署日誌）。
2. 已完成備份/個資交接，且交接對象與流程已由負責個資保護的角色確認。
3. 已確認不再需要保留這批資料（例如法規刪除要求，或確定不會重新上線訂閱功能）。
4. 已在下方「執行前查詢」章節，於正式環境資料庫上確認 `Subscriber` 資料筆數與最新資料時間，
   並將結果附加於回滾紀錄。

### 執行前查詢（記錄用，不修改資料）

```sql
SELECT count(*) FROM "Subscriber";
SELECT max("createdAt") FROM "Subscriber";
```

### 回滾 SQL

```sql
DROP TABLE "Subscriber";
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260710144200_add_subscriber';
```

- `DROP TABLE "Subscriber"` 移除資料表本身（連同其索引與唯一約束）。
- `DELETE FROM "_prisma_migrations" ...` 讓 Prisma migration history 與實際 schema 狀態
  保持一致，避免之後執行 `prisma migrate deploy` 時，Prisma 誤判該 migration 已套用而跳過，
  或因為 table 缺失而在下一次部署時失敗於「migration 已標記完成但物件不存在」的不一致狀態。

### 執行後驗證查詢

```sql
-- 應回傳 0 筆（table 已不存在）
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'Subscriber';

-- 應回傳 0 筆
SELECT migration_name FROM "_prisma_migrations"
WHERE migration_name = '20260710144200_add_subscriber';
```

若之後需要重新啟用訂閱功能，重新部署新版應用程式並執行 `npx prisma migrate deploy` 即可
重新套用 `20260710144200_add_subscriber` migration，重建一張全新（空白）的 `Subscriber` table。

## 演練紀錄（disposable DB，非正式環境）

以下演練於一次性 scratch 資料庫 `lin_blog_test_rollback_rehearsal` 上執行，**未觸碰**開發
資料庫 `lin_blog` 或整合測試資料庫 `lin_blog_test`，演練後已 `DROP DATABASE` 該 scratch DB。

1. 於空白 scratch DB 套用全部既有 migrations（含 `add_subscriber`）：

   ```
   $ DATABASE_URL=".../lin_blog_test_rollback_rehearsal" npx prisma migrate deploy
   5 migrations found in prisma/migrations
   Applying migration `20251220134307_add_site_settings_and_category_description`
   Applying migration `20260704105212_add_permission_version`
   Applying migration `20260705112908_add_post_allow_raw_html`
   Applying migration `20260710144200_add_subscriber`
   Applying migration `20260710160000_add_post_show_raw_html_toc`
   All migrations have been successfully applied.
   ```

2. 執行本文件「回滾 SQL」（`DROP TABLE` + `DELETE FROM "_prisma_migrations"`），並執行
   「執行後驗證查詢」：

   ```
   Subscriber table present after drop: []
   Migration row present after delete: []
   ```

   （空陣列代表 `information_schema.tables` 與 `_prisma_migrations` 皆已不含
   `Subscriber`/`add_subscriber` 記錄，回滾成功且 migration history 一致。）

3. 驗證回滾後 `prisma migrate deploy` 仍可正常重新套用（例如日後重新上線訂閱功能）：

   ```
   $ DATABASE_URL=".../lin_blog_test_rollback_rehearsal" npx prisma migrate deploy
   5 migrations found in prisma/migrations
   Applying migration `20260710144200_add_subscriber`
   All migrations have been successfully applied.
   ```

演練確認：drop-table 回滾可正確移除資料表並保持 migration history 一致，且回滾後系統仍可
透過標準 `migrate deploy` 流程重新套用該 migration，不會進入無法恢復的狀態。

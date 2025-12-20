## Why
目前後台與 API 權限控管不足、刪除行為不可追溯，且上傳檔案若放在 `public/` 會被直接以網址存取，造成資料外洩風險。需要導入：
- 角色權限控管（RBAC），明確限制各角色可操作的資源與動作。
- 全系統刪除改為軟刪除（soft delete），保留審計與復原能力。
- 上傳檔案改存放於非公開目錄（例如 `storage/`），並透過受控的檔案輸出路由串流或轉換後呈現，避免直接讀取檔案路徑。

## What Changes
- RBAC：
  - 定義角色能力矩陣（ADMIN/EDITOR/READER）。
  - 新增 `requireRole()` / `requirePermission()`，套用在所有 mutation API 與 admin 頁面。
- Soft delete：
  - 針對需支援刪除的核心模型加入 `deletedAt`（例如 Post/Category/Tag/User/Upload）。
  - 所有查詢預設排除 `deletedAt != null`。
  - API 的 DELETE 改為「設 deletedAt」。
- Secure storage：
  - 新增 `Upload` 資料表保存檔案 metadata（mime/size/sha、owner、visibility、deletedAt）。
  - 檔案實體存放在 `web/storage/`（不在 `public/`）。
  - 新增 `POST /api/uploads`：上傳寫入 storage，回傳 `uploadId` 與可用於 `<img>` 的 `src`（例如 `/api/files/<id>`）。
  - 新增 `GET /api/files/<id>`：串流輸出檔案；依 `visibility` 與權限控管決定是否允許讀取。
  - 前台圖片組 URL helper 改為支援 `uploadId` 或 `src=/api/files/<id>`，不再依賴公開目錄路徑。

## Security Notes
- 避免「知道 URL 就可直接拿到檔案」的風險：
  - 檔案 ID 使用不可預測的值（cuid/uuid）且不暴露原始檔名/路徑。
  -（可選）加入短效簽章 token（HMAC + expiry）以避免 URL 被分享後長期可用。

## Open Questions (Need Confirmation)
1) RBAC 矩陣：ADMIN/EDITOR/READER 各自能做哪些事？（例如：EDITOR 能否新增/編輯/發布文章、能否管理分類/標籤、能否管理使用者）
2) 檔案可見性：文章內圖片與封面圖片是否都視為「公開」？如果公開，任何人拿到 `/api/files/<id>` 仍可看到；你希望加簽章 token 嗎？
3) Soft delete 範圍：哪些資源要軟刪除？（預設：Post/Category/Tag/User/Upload；是否包含 SiteSetting？）

## Impact
- Affected code: Prisma schema/migrations, API routes, services, admin UI, frontend image rendering helpers。

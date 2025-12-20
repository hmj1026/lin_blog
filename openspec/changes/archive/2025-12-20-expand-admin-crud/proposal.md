## Why
後台目前缺少基礎的內容管理配套：
- 新增/編輯文章時，分類、標籤與文章狀態需有可選列表，且分類/標籤本身需要可維護的清單（新增/編輯/刪除）。
- 封面圖片需要支援上傳（與內文圖片一致），避免手動輸入網址。
- 後台使用者需要可管理（列表、新增、編輯），並能設定/調整使用者角色。

## What Changes
- Admin UI：
  - 新增 `/admin/categories`：分類列表 + 新增/編輯/刪除（含 `showInNav`、`navOrder`）。
  - 新增 `/admin/tags`：標籤列表 + 新增/編輯/刪除。
  - 新增 `/admin/users`：使用者列表 + 新增/編輯（含角色選擇、可選重設密碼）。
  - 文章新增/編輯頁：封面圖片改為「上傳」並回填相對路徑到 `coverImage`。
- API：
  - 補齊 `PUT/DELETE /api/tags/[id]`、`PUT/DELETE /api/categories/[id]`（現有 categories 只有 PUT）。
  - 新增 `GET/POST /api/users` 與 `PUT/DELETE /api/users/[id]`（至少需 create/update）。
  - 補齊 role-based access：所有「修改型」API（POST/PUT/DELETE）限制為 ADMIN（或 ADMIN/EDITOR 依需求）。
- Security：
  - 建立 server-side password hashing（bcrypt）用於 admin 新增使用者/重設密碼。

## Assumptions / Scope Notes
- 「多人使用」指套件/方案成熟度，不包含同篇即時協作。
- 封面上傳與內文上傳共用 `/api/uploads`（開發期存 `public/uploads`），上線可再替換 provider。
- 文章狀態目前僅 `DRAFT/PUBLISHED`；如需更多狀態（SCHEDULED 等）另開變更。

## Impact
- Affected code: `web/src/app/(admin)/admin/*`, `web/src/app/api/*`, `web/src/lib/services/*`, `web/src/lib/validations/*`, `web/src/components/admin/*`

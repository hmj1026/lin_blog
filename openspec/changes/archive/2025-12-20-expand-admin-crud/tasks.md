## 1. Access Control
- [x] 1.1 新增 `requireAdmin()`（或等價）並讓 admin-only API 使用。

## 2. Categories CRUD
- [x] 2.1 補齊 `DELETE /api/categories/[id]`。
- [x] 2.2 新增 `/admin/categories` UI：列表、新增、編輯、刪除（含 `showInNav/navOrder`）。

## 3. Tags CRUD
- [x] 3.1 新增 `PUT/DELETE /api/tags/[id]`。
- [x] 3.2 新增 `/admin/tags` UI：列表、新增、編輯、刪除。

## 4. Users CRUD
- [x] 4.1 新增 user create/update schema（含 password 可選）。
- [x] 4.2 新增 `GET/POST /api/users` 與 `PUT/DELETE /api/users/[id]`。
- [x] 4.3 新增 `/admin/users` UI：列表、新增、編輯（角色可選，密碼可重設）。

## 5. Post Form Improvements
- [x] 5.1 封面圖片支援上傳並回填相對路徑（共用 `/api/uploads`）。
- [x] 5.2 文章狀態選項來源整理（至少集中管理，避免散落字串）。

## 6. Verification
- [x] 6.1 `npm test` 通過（新增 user hashing / access control 等單元測試）。
- [x] 6.2 手動驗證：新增分類/標籤/使用者、建立文章、封面上傳與顯示。

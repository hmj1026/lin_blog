## 1. Proposal Confirmation
- [x] 1.1 確認 WYSIWYG 輸出格式（HTML/JSON）與圖片相對路徑規則。
- [x] 1.2 確認「後台設定」是否需包含 admin UI（預設會做簡易管理頁）。

## 2. Database
- [x] 2.1 擴充 `Category`：新增 `showInNav`、`navOrder` 欄位。
- [x] 2.2 新增 `SiteSetting`（或等價單例設定）以管理 `showBlogLink`。
- [x] 2.3 更新 Prisma schema 並補齊必要 index/default。

## 3. Seed / Data Migration
- [x] 3.1 將 `web/src/data/posts.ts` 的文章/分類/標籤轉換為 DB seed（含 slug 對應）。
- [x] 3.2 將既有 `RichContent[]` 轉成 WYSIWYG content 字串的可接受格式（預設 HTML）。
- [x] 3.3 保留既有 admin 種子帳號建立流程。

## 4. Frontend Uses DB
- [x] 4.1 `/`、`/blog`、`/blog/[slug]`、`/category/[category]`、`/tag/[tag]` 改由 DB 取文章/分類/標籤。
- [x] 4.2 更新 sitemap 資料來源為 DB（或在缺 DB 時 fallback）。
- [x] 4.3 新增 helper：以 env base URL 組圖片完整 URL，並在文章內容渲染時套用到 `<img src>`。

## 5. Navigation Driven By Backend
- [x] 5.1 Navbar 的分類連結改為：讀取 `showInNav=true` 且依 `navOrder` 排序的分類清單。
- [x] 5.2 Navbar 的「部落格」連結改為：依 `SiteSetting.showBlogLink` 顯示/隱藏。
- [x] 5.3 （可選）Footer 快速導覽同步改為同一份設定來源，避免硬編。

## 6. Admin
- [x] 6.1 新增簡易 admin 頁：調整 `showBlogLink`、分類 `showInNav/navOrder`。
- [x] 6.2 更新/補齊對應 API route（categories update、site setting get/update）與驗證。

## 7. Verification
- [x] 7.1 `npm run db:push` + `npm run db:seed` 後前台頁面內容正確。
- [x] 7.2 基本 e2e 或最小 smoke（如已存在測試慣例）。

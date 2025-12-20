## Why
前台目前使用靜態資料檔（`web/src/data/posts.ts`）渲染文章與分類，無法由後台動態管理內容與導覽。需要先把既有文章匯入資料庫並讓前台改由 DB 取資料，才能銜接後續的後台內容管理流程。

## What Changes
- 將前台既有文章轉為 seeder，執行 seed 後文章/分類/標籤會寫入 DB，前台改以 DB 內容渲染。
- 導覽列 `category` 連結由後台可設定的「要顯示的分類」動態產生（含排序）。
- 導覽列「部落格」連結由後台設定是否顯示（僅影響導覽是否出現，不一定阻擋路由存取）。
- 文章內容欄位存放 WYSIWYG 輸出格式（以字串存入 `Post.content`），圖片以「相對連結」存放；前台透過 env 設定的上傳位置 base URL + helper 組出圖片完整網址後顯示。

## Assumptions / Open Questions
- WYSIWYG 輸出以 HTML 字串存入 `Post.content`（若實際是 JSON/其他格式，需要調整渲染與 seed 轉換）。
- 「後台設定」包含簡易管理介面：提供一個 admin 頁面可切換 `showBlogLink` 與分類的 `showInNav/navOrder`。（若你希望先做 DB 欄位 + API、UI 之後再補，會縮小此變更範圍。）

## Impact
- Affected code: `web/prisma/schema.prisma`, `web/prisma/seed.ts`, `web/src/app/(frontend)/*`, `web/src/components/navbar.tsx`, `web/src/components/footer.tsx`, `web/src/env.ts`, services/API routes.
- Affected specs: 新增 `content-db`（本變更提案內定義）。

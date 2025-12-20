## Why
後台目前「新增文章」尚未接上內容編輯器；若自行實作編輯器會增加維護成本與風險。需要導入常用且社群成熟的 WYSIWYG 套件，快速提供文字排版與圖片插入能力，並輸出 HTML 字串存入 DB 的 `Post.content`。

## What Changes
- 導入主流 WYSIWYG 套件（提案預設：TipTap）。
- 後台新增/編輯文章頁提供所見即所得編輯體驗，並以 HTML 字串提交到 `/api/posts` 存入 DB。
- 支援圖片插入：開發階段上傳至本地（回傳相對路徑），上線後可透過 env 切換為第三方存放（回傳相對路徑或檔名），前台以 `NEXT_PUBLIC_UPLOAD_BASE_URL` 組成完整 URL 顯示。
- 內容安全：後端在寫入 DB 前對 HTML 做 sanitize（避免 XSS），前台渲染前仍保留最小防護與圖片 URL rewrite。

## Selection Rationale
選用 TipTap（ProseMirror 生態）：
- React/Next.js 常見採用、文件完整、擴充性高（StarterKit、Link、Image 等）。
- 可直接輸出 HTML（符合目前 DB 存放策略）。
- 圖片可客製上傳流程（呼叫自家 API，再插入相對 URL）。

## Impact
- Affected code: `web/src/app/(admin)/admin/posts/*`, `web/src/app/api/posts/*`, 新增 upload API（本地/供應商切換）、新增 sanitize 套件與 helper。

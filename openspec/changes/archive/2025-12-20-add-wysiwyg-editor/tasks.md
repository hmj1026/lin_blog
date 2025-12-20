## 1. Package & Setup
- [x] 1.1 安裝 TipTap 相關套件（React + StarterKit + Image/Link 等）。
- [x] 1.2 （若需要）安裝 HTML sanitize 套件並加入 server-side sanitize。

## 2. Upload (Dev Local First)
- [x] 2.1 新增 `POST /api/uploads`：開發階段寫入 `web/public/uploads`，回傳相對路徑（例如 `/uploads/xxx.png`）。
- [x] 2.2 設計可切換 provider：有第三方 token 時改走供應商，仍回傳相對路徑/檔名。

## 3. Admin Editor UI
- [x] 3.1 `新增文章` 頁加入 TipTap editor，欄位：標題、摘要、分類、標籤、封面、閱讀時間、狀態、發佈時間、精選。
- [x] 3.2 編輯器支援：Heading、Bold/Italic、List、Quote、Link、Image（上傳後插入）。
- [x] 3.3 提交呼叫 `/api/posts`，並顯示成功/錯誤狀態。

## 4. Security
- [x] 4.1 API 存檔前 sanitize HTML，拒絕/清理危險 tag/attribute。
- [x] 4.2 補齊單元測試（sanitize 與 upload 回傳格式）。

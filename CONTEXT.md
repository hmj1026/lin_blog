# Domain Glossary

專案領域詞彙表。架構審查與設計討論以此處的名稱為準。

## 內容管線（Content Pipeline）

使用者撰寫的 HTML 內容從存檔到渲染的完整安全路徑。單一 deep module（規劃位置：`web/src/lib/content-pipeline/`），對外兩個 interface：

- **存檔端** `sanitizeContentByMode(html, mode)`：依內容模式選擇 sanitizer（嚴格 allowlist / 寬鬆 allowlist + CSS 硬化）。posts 與 site-settings（About）共用，不得各自複製判斷。
- **渲染端** `prepareForRender(html, mode) → { html, tocItems, strategy }`：`strategy` 為 `"iframe"` 或 `"inline"`，頁面只依 strategy 渲染，不得自行讀旗標選函式。`mode=false` 時管線以嚴格 sanitizer 重消毒（取代舊的弱正則 `stripDangerousAttributes`），使旗標與內容去同步時仍安全。

不變量：**旗標→sanitizer→renderer 三元組不可分離**——內容模式的判斷只存在於內容管線 module 內。

## 內容模式（Content Mode）

`allowRawHtml` 旗標的領域意義：`false` = 視覺模式（TipTap，嚴格 allowlist，inline 渲染）；`true` = 原始 HTML 模式（寬鬆 allowlist，iframe sandbox 渲染，真正安全邊界是 sandbox 無 `allow-same-origin`）。

出現位置：posts 的 `allowRawHtml`、site-settings 的 `aboutAllowRawHtml`。

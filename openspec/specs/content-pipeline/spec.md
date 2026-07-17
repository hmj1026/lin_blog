# content-pipeline Specification

## Purpose
TBD - created by archiving change deepen-content-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Single Module Owns Content Mode Decisions
使用者 HTML 內容的模式判斷（依 `allowRawHtml` 選擇 sanitizer 與渲染策略）SHALL 只存在於 `web/src/lib/content-pipeline/` module 內。存檔端 SHALL 透過 `sanitizeContentByMode(html, mode)` 消毒；posts 與 site-settings（About）MUST 共用同一實作，不得各自複製判斷。

#### Scenario: Posts and About share the save-time sanitizer selection
- **WHEN** posts use case 或 site-settings `updateAboutContent` 儲存內容
- **THEN** 兩者呼叫 content-pipeline 匯出的同一個 `sanitizeContentByMode`，`mode=true` 走寬鬆 sanitizer、`mode=false` 走嚴格 sanitizer

#### Scenario: No mode branching outside the pipeline
- **WHEN** 檢視 `app/` 頁面與 modules 的存檔路徑
- **THEN** 除 content-pipeline module 內部外，不存在依 `allowRawHtml` 選擇 sanitize/prepare 函式的條件分支

### Requirement: Render Preparation Returns A Strategy
content-pipeline SHALL 提供 `prepareForRender(html, mode)`，回傳 `{ html, tocItems, strategy }`，其中 `strategy` 為 `"iframe"`（raw 模式）或 `"inline"`（一般模式）。渲染頁面 MUST 僅依 `strategy` 決定渲染方式，不得自行讀取模式旗標選擇處理函式。

#### Scenario: Raw mode yields iframe strategy
- **WHEN** 以 `mode=true` 呼叫 `prepareForRender`
- **THEN** 回傳 `strategy === "iframe"`，且 html 保留 class/style/`<style>`（沿用既有 raw 處理：標題 ID、圖片路徑重寫、head 樣式回收）

#### Scenario: Normal mode yields inline strategy
- **WHEN** 以 `mode=false` 呼叫 `prepareForRender`
- **THEN** 回傳 `strategy === "inline"`，且 html 已經嚴格 allowlist 消毒、含標題 ID 與重寫後的圖片路徑

### Requirement: Strict Re-Sanitization On Inline Render
`prepareForRender` 在 `mode=false` 時 SHALL 以嚴格 allowlist sanitizer（`sanitizePostHtml`）重新消毒內容，取代先前的正則式移除。此防線 MUST 使旗標與已存內容去同步時（寬鬆消毒過的內容以 `mode=false` 渲染）輸出仍安全。

#### Scenario: Desynced raw content renders safely inline
- **WHEN** 內容曾以 raw 模式儲存（含 `<style>` 區塊、`style=`/`class` 屬性、`<div>` 結構），之後以 `mode=false` 呼叫 `prepareForRender`
- **THEN** 輸出 html 不含 `<style>` 區塊、`style=` 屬性與任何事件屬性，且 `strategy === "inline"`

#### Scenario: Legitimate strict-mode content is unaffected
- **WHEN** 內容僅含嚴格 allowlist 內的標籤與屬性（p、h2/h3、a[href]、img[src] 等），以 `mode=false` 呼叫 `prepareForRender`
- **THEN** 輸出保留全部內容，行為與既有 `prepareContent` 對合法內容的輸出一致


# post-raw-html-mode Specification

## Purpose
定義文章原始 HTML 模式的需求，包括每篇文章的 allowRawHtml 旗標、開啟後放寬的內容消毒規則、後台撰寫時的模式切換，以及前台以隔離 iframe 渲染原始 HTML 文章的安全機制。
## Requirements
### Requirement: Per-Post Raw HTML Mode Flag
系統 SHALL 在 `Post`（與 `PostVersion`）新增 `allowRawHtml` 布林欄位，預設為 `false`，決定該文章
（或該版本）是否啟用保留原始 HTML/CSS 的渲染模式。

#### Scenario: Default preserves existing behavior
- **WHEN** 讀取一篇未設定過 `allowRawHtml` 的既有文章
- **THEN** `allowRawHtml` 為 `false`，且該文章維持現有嚴格消毒 + inline 渲染行為

#### Scenario: Version restore preserves the mode active at that version
- **WHEN** 管理員將文章還原到某個歷史版本
- **THEN** 文章的 `allowRawHtml` 值 SHALL 更新為該版本當時的 `allowRawHtml` 值

### Requirement: Relaxed Sanitization For Raw HTML Posts
系統 SHALL 為 `allowRawHtml = true` 的文章提供獨立的寬鬆消毒函式，允許 `class`、`style` 屬性與
`<style>` 標籤等額外標籤/屬性通過，但仍必須移除 `<script>`、`on*` 事件屬性、`javascript:`/`vbscript:`
URI，以及常見 CSS 注入手法（`expression()`、`-moz-binding`、`behavior:`、`@import`）。一般文章
（`allowRawHtml = false`）的既有嚴格消毒行為不受影響。

#### Scenario: Style and class attributes survive sanitization
- **GIVEN** 一篇 `allowRawHtml = true` 的文章，內容含 `<style>`、`class`、`style` 屬性
- **WHEN** 文章被儲存
- **THEN** `<style>` 內容與 `class`/`style` 屬性值被保留在儲存後的 HTML 中

#### Scenario: Script and event handlers are still stripped in raw HTML mode
- **GIVEN** 一篇 `allowRawHtml = true` 的文章，內容含 `<script>` 或 `onerror=` 等事件屬性
- **WHEN** 文章被儲存
- **THEN** `<script>` 標籤與事件屬性一律被移除，即使該文章啟用原始 HTML 模式

#### Scenario: Dangerous CSS constructs are stripped
- **GIVEN** 文章的 `<style>` 內容或 `style=""` 屬性值含 `expression()`、`-moz-binding`、`behavior:`
  或 `@import`
- **WHEN** 文章被儲存
- **THEN** 這些危險 CSS 構造一律被移除

#### Scenario: Toggling off forces re-sanitization
- **GIVEN** 一篇原本 `allowRawHtml = true` 且內容含 `class`/`style` 的文章
- **WHEN** 管理員將 `allowRawHtml` 切換為 `false` 並儲存（即使未修改 `content` 本身）
- **THEN** 系統 SHALL 以嚴格消毒器重新處理現有內容，移除不再允許的 `class`/`style`/擴充標籤

### Requirement: Admin Raw HTML Authoring Toggle
系統 SHALL 在後台文章編輯表單提供「原始 HTML 模式」開關；啟用時不掛載 TipTap 視覺編輯器（避免其
schema 剝除自訂樣式/標籤），改以純文字方式直接編輯 HTML 內容，並顯示風險/行為差異提示。

#### Scenario: Raw HTML mode bypasses TipTap
- **GIVEN** 管理員在文章表單開啟「原始 HTML 模式」
- **WHEN** 表單重新渲染內容編輯區
- **THEN** 系統顯示純文字輸入區而非 TipTap 視覺編輯器，內容不經過 TipTap schema 處理

#### Scenario: Enabling or disabling shows a warning
- **WHEN** 管理員切換「原始 HTML 模式」開關
- **THEN** 系統顯示提示文案，說明此模式對安全消毒範圍與目錄導覽行為的影響

### Requirement: Isolated iframe Rendering For Raw HTML Posts
系統 SHALL 在文章詳情頁對 `allowRawHtml = true` 的文章，以 `<iframe sandbox="allow-scripts" srcDoc>`
渲染文章內容（含其自訂 `<style>`），使文章樣式不受站台全域樣式影響，也不會外洩污染站台其餘部分。
iframe 內僅允許執行系統自寫的高度回報與捲動控制腳本，不執行使用者內容中的任何腳本（因已於消毒階段
被移除）。iframe SHALL NOT 啟用 `allow-same-origin` 或 `allow-top-navigation`。

#### Scenario: Custom styles render without site-wide CSS interference
- **GIVEN** 一篇 `allowRawHtml = true` 的文章，其 `<style>` 定義了與全域 `.wysiwyg` 樣式衝突的規則
- **WHEN** 訪客瀏覽該文章詳情頁
- **THEN** 文章內容以其自身 `<style>` 呈現，不受全域 `.wysiwyg`/Tailwind 樣式影響

#### Scenario: Article styles do not leak outside the iframe
- **GIVEN** 一篇 `allowRawHtml = true` 的文章包含會影響 `body`/全域選擇器的 CSS 規則
- **WHEN** 訪客瀏覽該文章詳情頁
- **THEN** 該規則僅在 iframe 內生效，站台導覽列、後台或其他頁面元素的樣式不受影響

#### Scenario: Injected script never executes
- **GIVEN** 一篇 `allowRawHtml = true` 的文章，其原始內容曾包含 `<script>alert(1)</script>`
- **WHEN** 訪客瀏覽該文章詳情頁
- **THEN** 該腳本不會被執行（因已於儲存階段被消毒移除）

#### Scenario: Table of contents jumps into the iframe
- **GIVEN** 一篇 `allowRawHtml = true` 的文章顯示目錄（ToC）
- **WHEN** 訪客點擊目錄中的一個項目
- **THEN** 系統透過 `postMessage` 通知 iframe 捲動到對應標題

#### Scenario: Preview renders the same isolated content
- **GIVEN** 管理員預覽一篇 `allowRawHtml = true` 的草稿
- **WHEN** 開啟預覽視窗
- **THEN** 預覽 iframe 內正確顯示巢狀的文章隔離 iframe，且樣式與安全行為與正式頁面一致


# post-raw-html-mode Specification

## Purpose
定義文章原始 HTML 模式的需求，包括每篇文章的 allowRawHtml 旗標、開啟後放寬的內容消毒規則、後台撰寫時的模式切換，以及前台以隔離 iframe 渲染原始 HTML 文章的安全機制。
## Requirements
### Requirement: Per-Post Raw HTML Mode Flag
系統 SHALL 在 `Post`（與 `PostVersion`）提供 `allowRawHtml` 與 `showRawHtmlToc` 布林欄位；兩者預設皆為
`false`。`allowRawHtml` 決定該文章（或該版本）是否啟用保留原始 HTML/CSS 的渲染模式，
`showRawHtmlToc` 則只在原始 HTML 模式決定是否顯示系統產生的目錄。

#### Scenario: Default preserves existing sanitization and disables raw TOC
- **WHEN** 讀取一篇未設定過 `allowRawHtml` 與 `showRawHtmlToc` 的既有文章
- **THEN** 兩個欄位皆為 `false`
- **AND** 該文章維持現有嚴格消毒與 inline 渲染行為
- **AND** 不顯示原始 HTML 系統目錄

#### Scenario: Raw HTML TOC is opt-in per post
- **GIVEN** 一篇 `allowRawHtml = true` 的文章
- **WHEN** 管理員只為該文章設定 `showRawHtmlToc = true`
- **THEN** 系統 SHALL 只為該文章啟用原始 HTML 系統目錄
- **AND** 不影響其他文章的目錄設定

#### Scenario: Version restore preserves both rendering flags
- **WHEN** 管理員將文章還原到某個歷史版本
- **THEN** 文章的 `allowRawHtml` 與 `showRawHtmlToc` 值 SHALL 一起更新為該版本當時的值

#### Scenario: Normal posts cannot retain a raw-only TOC flag
- **GIVEN** API、匯入檔或歷史版本提供 `allowRawHtml = false` 與 `showRawHtmlToc = true`
- **WHEN** application use case 驗證並保存文章
- **THEN** 系統 SHALL 將 `showRawHtmlToc` 正規化為 `false`

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
系統 SHALL 在後台文章編輯表單提供清楚且互斥的「視覺編輯器」與「原始 HTML」文章撰寫模式；原始 HTML
模式啟用時不掛載 TipTap 視覺編輯器（避免其 schema 剝除自訂樣式/標籤），改以純文字方式直接編輯 HTML
內容，並顯示安全、目錄與前台布局差異。原始 HTML 模式 SHALL 另提供 `showRawHtmlToc` 設定，預設關閉，
且 SHALL 保持圖片上傳與插入能力可用。

#### Scenario: Raw HTML mode bypasses TipTap
- **GIVEN** 管理員在文章表單選擇「原始 HTML」撰寫模式
- **WHEN** 表單重新渲染內容編輯區
- **THEN** 系統顯示純文字輸入區而非 TipTap 視覺編輯器
- **AND** 內容不經過 TipTap schema 處理

#### Scenario: Authoring modes are mutually exclusive
- **WHEN** 管理員在「視覺編輯器」與「原始 HTML」之間切換
- **THEN** 同一時間 SHALL 只有一個文章撰寫模式為啟用狀態
- **AND** 系統 SHALL 使用文字標籤清楚顯示目前模式

#### Scenario: Lossy mode switch requires confirmation
- **GIVEN** 切換文章撰寫模式可能讓 TipTap schema 或下次儲存的 sanitizer 移除結構或樣式
- **WHEN** 管理員觸發模式切換
- **THEN** 系統 SHALL 在切換前說明不可逆的可能影響
- **AND** 只有管理員確認後才 SHALL 完成切換

#### Scenario: Mode switching preserves unsaved drafts
- **GIVEN** 管理員已在任一撰寫模式修改尚未儲存內容
- **WHEN** 管理員取消切換或在同一編輯 session 切回原模式
- **THEN** 系統 SHALL 保留並恢復該模式尚未儲存的草稿
- **AND** 模式切換本身 SHALL NOT 呼叫 server sanitizer

#### Scenario: Enabling or disabling shows a warning
- **WHEN** 管理員切換文章撰寫模式
- **THEN** 系統顯示提示文案，說明該模式對安全消毒、目錄導覽與前台布局的影響

#### Scenario: Raw HTML TOC defaults off in the form
- **GIVEN** 管理員新增原始 HTML 文章且尚未設定目錄偏好
- **WHEN** 原始 HTML 編輯區顯示
- **THEN** `showRawHtmlToc` 控制項 SHALL 為關閉
- **AND** 系統 SHALL 說明作者可在 HTML 內自行提供目錄

#### Scenario: Media controls remain available in raw HTML mode
- **GIVEN** 管理員正在原始 HTML textarea 中編輯內容
- **WHEN** 管理員開啟媒體上傳控制
- **THEN** 系統 SHALL 允許上傳圖片並將相對 URL 或 `<img>` 片段插入內容
- **AND** 不得為了插入圖片而掛載或切換至 TipTap

### Requirement: Isolated iframe Rendering For Raw HTML Posts
系統 SHALL 在文章詳情頁對 `allowRawHtml = true` 的文章，以 `<iframe sandbox="allow-scripts" srcDoc>`
渲染文章內容（含其自訂 `<style>`），使文章樣式不受站台全域樣式影響，也不會外洩污染站台其餘部分。
原始 HTML 內容區 SHALL 使用接近 layout viewport 的安全 gutter 外框，不保留固定文章側欄；iframe 內建文件
SHALL NOT 加入限制作者內容的 max-width 或左右 padding。iframe 內僅允許執行系統自寫的高度回報與捲動
控制腳本，不執行使用者內容中的任何腳本（因已於消毒階段被移除）。iframe SHALL NOT 啟用
`allow-same-origin` 或 `allow-top-navigation`。

#### Scenario: Custom styles render without site-wide CSS interference
- **GIVEN** 一篇 `allowRawHtml = true` 的文章，其 `<style>` 定義了與全域 `.wysiwyg` 樣式衝突的規則
- **WHEN** 訪客瀏覽該文章詳情頁
- **THEN** 文章內容以其自身 `<style>` 呈現，不受全域 `.wysiwyg` 或 Tailwind 樣式影響

#### Scenario: Article styles do not leak outside the iframe
- **GIVEN** 一篇 `allowRawHtml = true` 的文章包含會影響 `body` 或全域選擇器的 CSS 規則
- **WHEN** 訪客瀏覽該文章詳情頁
- **THEN** 該規則僅在 iframe 內生效
- **AND** 站台導覽列、後台或其他頁面元素的樣式不受影響

#### Scenario: Injected script never executes
- **GIVEN** 一篇 `allowRawHtml = true` 的文章，其原始內容曾包含 `<script>alert(1)</script>`
- **WHEN** 訪客瀏覽該文章詳情頁
- **THEN** 該腳本不會被執行（因已於儲存階段被消毒移除）

#### Scenario: Raw HTML content uses measurable desktop width
- **GIVEN** layout viewport 寬度為 1903px 且文章 `allowRawHtml = true`
- **WHEN** 訪客在桌面瀏覽文章詳情
- **THEN** iframe 父內容外框的 computed width SHALL 至少為 1871px
- **AND** 左右安全 gutter 各不得超過 16px
- **AND** iframe 旁不得保留固定 280px 文章側欄

#### Scenario: System srcdoc does not narrow author HTML
- **GIVEN** 一篇原始 HTML 文章使用自有 inline padding、max-width 或 `auto-fit/minmax()` 網格
- **WHEN** 系統組合 iframe srcdoc
- **THEN** 系統提供的 `html` 與 `body` reset SHALL 將 margin 及 padding 歸零
- **AND** 系統 SHALL NOT 對作者內容加入 max-width 或額外左右 padding
- **AND** 作者 HTML SHALL 以 iframe 的完整可用寬度計算布局

#### Scenario: Raw HTML TOC stays hidden by default
- **GIVEN** 一篇 `allowRawHtml = true`、`showRawHtmlToc = false` 且包含多個 H2/H3 的文章
- **WHEN** 訪客瀏覽文章詳情頁
- **THEN** 系統 SHALL NOT 顯示自動產生的目錄
- **AND** 作者 HTML 內自帶的目錄 SHALL 維持可見與可操作

#### Scenario: Table of contents jumps into the iframe when enabled
- **GIVEN** 一篇 `allowRawHtml = true`、`showRawHtmlToc = true` 且包含至少兩個 H2/H3 的文章
- **WHEN** 訪客看到位於寬版 iframe 正上方標準 `section-shell` 內的系統目錄，並點擊其中一個項目
- **THEN** 系統透過 `postMessage` 通知 iframe 定位到對應標題
- **AND** 目錄 SHALL NOT 在 iframe 旁保留固定欄位或縮小 iframe

#### Scenario: Mobile outer page does not overflow horizontally
- **GIVEN** 一篇原始 HTML 文章包含寬圖片或固定寬度元素
- **WHEN** 訪客以手機寬度瀏覽文章詳情
- **THEN** iframe 外框 SHALL 不超過 layout viewport 的可用寬度
- **AND** 作者內容的 intrinsic overflow SHALL 被隔離在 iframe 內
- **AND** 外層站台 document SHALL 不產生水平捲軸

#### Scenario: Preview renders the same isolated content and settings
- **GIVEN** 管理員預覽一篇 `allowRawHtml = true` 的草稿
- **WHEN** 開啟預覽視窗
- **THEN** 預覽 iframe 內正確顯示巢狀的文章隔離 iframe
- **AND** 寬版布局、安全行為與 `showRawHtmlToc` 結果 SHALL 與正式頁面一致


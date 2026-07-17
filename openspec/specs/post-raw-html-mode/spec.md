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
（`allowRawHtml = false`）的既有嚴格消毒行為不受影響。此外，危險 CSS 過濾 SHALL NOT 破壞合法的 CSS
屬性——特別是名稱僅碰巧包含被過濾子字串的屬性（例如 `scroll-behavior`）必須被保留；過濾 SHALL 僅
針對真正的危險宣告（例如獨立的 `behavior:`、`-ms-behavior:`），而非任何以其為子字串的合法屬性名稱。

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

#### Scenario: Legitimate CSS whose name contains a filtered substring is preserved

- **GIVEN** 文章的 `<style>` 內容或 `style=""` 屬性值同時含合法的 `scroll-behavior:smooth` 與危險的
  `behavior:url(x.htc)`
- **WHEN** 文章被儲存（寬鬆消毒）
- **THEN** `scroll-behavior:smooth` 完整保留（不被截斷成 `scroll-`），而 `behavior:url(x.htc)` 仍被移除

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

### Requirement: Guard Against Silent Rich HTML Loss In Normal Mode

當管理員以「原始 HTML 模式」關閉（OFF，預設）的狀態儲存文章時，後台編輯器 SHALL 偵測內容是否含有
區塊級標籤（例如 `<div>`、`<section>`、`<table>`）、inline `style=` 屬性，或 `<style>` 區塊；若偵測
到，系統 SHALL 於儲存前向作者提出警告（明確說明此丟失為不可逆），並提供一鍵切換為「原始 HTML 模式」
的操作。作者 MAY 仍選擇以一般模式儲存，但嚴格消毒器對結構與樣式的剝除 SHALL NOT 再靜默發生（必須經過
作者確認）。偵測邏輯 SHALL 由純函式工具（`detectStrippedRichHtml`）提供，作為單一真實來源。純
WYSIWYG 內容（僅 `p`/`h2`/`h3`/`ul`/`strong` 等既有允許標籤、無 inline `style`／`<style>`）SHALL NOT
觸發任何警告。

#### Scenario: Rich HTML in normal mode surfaces a warning affordance

- **GIVEN** 管理員在「原始 HTML 模式」為 OFF 的文章表單中輸入含 `<div style="...">` 的內容
- **WHEN** 表單偵測該內容
- **THEN** 系統顯示 inline 警告橫幅，說明一般模式會剝除結構與樣式且不可逆，並提供一個
  「切換為原始 HTML 模式」的操作

#### Scenario: Saving stripped-prone content requires confirmation

- **GIVEN** 管理員在「原始 HTML 模式」為 OFF 且內容含 `<div style="...">`（或 `<style>`／區塊級標籤）
- **WHEN** 管理員送出表單儲存
- **THEN** 系統要求確認，明確告知結構與樣式將被不可逆地剝除；作者取消確認時 SHALL 中止本次儲存
  （不送出、內容不被剝除）

#### Scenario: Plain WYSIWYG content saves without warning

- **GIVEN** 管理員在「原始 HTML 模式」為 OFF，內容僅含 `p`/`h2`/`h3`/`ul`/`strong` 等既有允許標籤，
  且不含 inline `style`／`<style>`／區塊級包裹層
- **WHEN** 管理員送出表單儲存
- **THEN** 系統不顯示警告、不要求額外確認，直接儲存

### Requirement: Import Preserves Raw HTML Mode

文章匯入路徑（`importPosts`）SHALL 依每篇文章各自的 `allowRawHtml` 值選擇消毒器，並將該旗標持久化，
使匯入的原始 HTML 文章保留其 inline 樣式。匯入 payload 結構 SHALL 帶入 `allowRawHtml`（未提供時
預設為 `false`）。當 `allowRawHtml = true` 時 SHALL 使用寬鬆消毒器並儲存旗標為 `true`；當
`allowRawHtml` 缺省或為 `false` 時 SHALL 維持既有嚴格消毒行為。

#### Scenario: Importing a raw HTML post preserves inline styles

- **GIVEN** 一筆匯入資料 `allowRawHtml: true` 且內容含 inline `style`／`<style>`
- **WHEN** 該筆資料被匯入建立或更新
- **THEN** inline 樣式被保留，且該文章的 `allowRawHtml` 被儲存為 `true`

#### Scenario: Importing without the flag keeps strict sanitization

- **GIVEN** 一筆匯入資料未提供 `allowRawHtml`（或為 `false`）且內容含 `<div>`/inline `style`
- **WHEN** 該筆資料被匯入建立或更新
- **THEN** 內容以嚴格消毒器處理（如既有行為剝除 `<div>`/inline `style`），且 `allowRawHtml` 儲存為
  `false`

### Requirement: In-Content Anchor Navigation For Raw HTML Posts

系統 SHALL 讓 `allowRawHtml = true` 文章「內文中」的同頁錨點連結（`href` 以 `#` 開頭，指向文件內某
元素 `id`，例如文章自帶目錄的 `<a href="#quick-answer">`）在點擊時捲動到對應段落。由於渲染用的
`<iframe sandbox="allow-scripts" srcDoc>` 無 `allow-same-origin`、內容以全高呈現且無內部捲軸，實際捲動
容器為外層 window；且 srcdoc 文件的 base URL 繼承自外層頁面，`#` 連結的預設行為會被判定為跨文件導覽、
觸發 iframe 自我重載（遞迴內嵌整頁）。因此 iframe SHALL 攔截所有此類內文 `#` 錨點連結（阻止預設導覽），
並透過既有的父子 `postMessage` 捲動通道通知外層頁面捲動到目標元素所在位置，達成與側邊欄目錄一致的
導覽體驗。此行為 SHALL NOT 放寬 iframe
安全邊界（`allow-same-origin` / `allow-top-navigation` 維持關閉），也 SHALL NOT 執行使用者內容中的
任何腳本。

#### Scenario: In-content anchor scrolls the reader to the target section

- **GIVEN** 一篇 `allowRawHtml = true` 的文章，內文含指向文件內某元素 `id` 的同頁錨點連結
- **WHEN** 訪客點擊該內文錨點連結
- **THEN** 系統透過 `postMessage` 通知外層頁面，使外層 window 平滑捲動到該目標元素所在位置

#### Scenario: Missing or empty anchor target is a safe no-op

- **GIVEN** 一篇 `allowRawHtml = true` 的文章，內文的錨點連結為空 hash（`#`）或指向不存在的 `id`
- **WHEN** 訪客點擊該連結
- **THEN** 系統不捲動、不拋出錯誤，頁面維持穩定（攔截後 no-op；不得放行預設行為觸發 iframe 自我導覽重載）

#### Scenario: Behavior is identical in preview and published views

- **GIVEN** 一篇 `allowRawHtml = true` 的文章含內文同頁錨點連結
- **WHEN** 管理員於預覽視窗中點擊該內文錨點連結
- **THEN** 捲動行為與正式發布頁面一致（皆由外層頁面代為捲動至目標段落）

#### Scenario: Anchor handling does not weaken the sandbox

- **WHEN** 內文錨點連結的點擊被攔截並委由外層頁面捲動
- **THEN** iframe 仍不啟用 `allow-same-origin` 或 `allow-top-navigation`，且不執行使用者內容中的任何
  腳本；非 `#` 連結仍維持既有「由父頁面代為導覽」的行為

### Requirement: Render Path Selected By Pipeline Strategy
文章與 About 頁的渲染方式 SHALL 由 content-pipeline `prepareForRender` 回傳的 `strategy` 決定：`"iframe"` 渲染 `RawHtmlPostFrame`，`"inline"` 渲染 inline HTML。頁面元件 MUST NOT 自行讀取 `allowRawHtml`／`aboutAllowRawHtml` 選擇內容處理函式。

#### Scenario: Blog page renders by strategy
- **WHEN** `blog/[slug]` 頁面渲染一篇 raw HTML 模式文章
- **THEN** 頁面依 `prepareForRender` 回傳的 `strategy === "iframe"` 渲染 iframe sandbox，行為與現行 raw 模式渲染一致

#### Scenario: About page renders by strategy
- **WHEN** `/about` 頁面渲染非 raw 模式的關於我內容
- **THEN** 頁面依 `strategy === "inline"` 渲染，內容經嚴格 allowlist 消毒

### Requirement: Desynced Flag Renders Safely
當已儲存內容與目前模式旗標不一致（內容曾以 raw 模式的寬鬆 allowlist 消毒，旗標其後為 false 且內容未重存）時，系統 SHALL 於渲染前以嚴格 allowlist sanitizer 重消毒，確保 inline 渲染不含 `<style>`、`style=` 屬性與事件屬性。

#### Scenario: Raw-sanitized content with flag off is strictly cleaned at render
- **WHEN** 資料庫中的文章 content 含 raw 模式放行的 `style=` 屬性與 `<style>` 區塊，且 `allowRawHtml=false`
- **THEN** 頁面 inline 輸出不含 `style=` 屬性與 `<style>` 區塊，僅保留嚴格 allowlist 內的標籤與屬性


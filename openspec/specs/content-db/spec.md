# content-db Specification

## Purpose
定義前台內容資料庫化的需求，包括將前台文章資料匯入資料庫、以字串儲存 WYSIWYG 內容、以環境變數基礎 URL 解析圖片路徑、由後台設定產生導覽連結，以及針對常見時間區間查詢建立索引。
## Requirements
### Requirement: Seed Frontend Posts Into Database
系統 SHALL 將現有前台文章資料匯入資料庫，並以資料庫資料作為前台渲染來源。

#### Scenario: Seed imports all existing frontend posts
- **GIVEN** 專案已有前台靜態文章資料（`web/src/data/posts.ts`）
- **WHEN** 執行 `web` 專案的 DB seed
- **THEN** DB 中存在對應的 `Post/Category/Tag` 資料，且文章可被前台讀取渲染

### Requirement: WYSIWYG Content Stored As String
系統 SHALL 將 WYSIWYG 編輯器輸出的格式以字串儲存在 `Post.content` 欄位中。

#### Scenario: Post content renders from DB
- **GIVEN** DB `Post.content` 已存入 WYSIWYG 輸出字串
- **WHEN** 使用者瀏覽文章詳情頁
- **THEN** 前台使用該字串渲染文章內容

### Requirement: Image URL Resolution Via Env Base URL
系統 SHALL 支援圖片以相對連結存放於文章內容中，並透過 env 設定的上傳位置 base URL + helper 組成完整圖片 URL 後顯示。

#### Scenario: Relative image src is resolved to absolute URL
- **GIVEN** 文章內容包含 `<img src="relative/path.png">`
- **WHEN** 前台渲染該文章內容
- **THEN** 圖片實際請求的 URL 會以 env base URL 組成（例如 `${NEXT_PUBLIC_UPLOAD_BASE_URL}/relative/path.png`）

### Requirement: Navigation Links Generated From Backend Settings
系統 SHALL 由後台設定決定導覽列需要顯示哪些文章分類與是否顯示「部落格」連結。

#### Scenario: Navbar categories are generated from enabled categories
- **GIVEN** 分類具有 `showInNav` 與 `navOrder` 設定
- **WHEN** 使用者檢視前台導覽列
- **THEN** 導覽列僅顯示 `showInNav=true` 的分類，並依 `navOrder` 排序

#### Scenario: Blog link visibility is toggled by backend
- **GIVEN** 系統設定 `showBlogLink` 可被後台更新
- **WHEN** `showBlogLink=false`
- **THEN** 前台導覽列不顯示「部落格」連結

### Requirement: Indexes for Common Time-Range Queries
The system SHALL provide database indexes for common time-range queries on event tables.

#### Scenario: View events query by time range
- **GIVEN** view events are stored in the database
- **WHEN** the system queries events filtered by time range (e.g. last 7/30/365 days)
- **THEN** an index optimized for the time filter SHALL exist

### Requirement: About Page Content Stored In Site Settings

系統 SHALL 於 `SiteSetting` singleton（key = `default`）以欄位形式儲存「關於我」頁面的開關與內容，
比照既有 `showNewsletter`/`newsletterTitle` 與 `showContact`/`contactTitle` 的模式。新增欄位為：
`showAbout`（Boolean，預設 `false`）、`aboutTitle`（nullable String）、`aboutContent`（nullable String，
sanitized HTML）、`aboutAllowRawHtml`（Boolean，預設 `false`）、`aboutShowRawHtmlToc`（Boolean，預設 `false`）。
新增欄位 MUST 為向後相容（既有列在 migration 後採用預設值，行為不變）。

#### Scenario: About fields default to hidden and empty

- **GIVEN** 一個尚未設定過「關於我」的站台
- **WHEN** 系統讀取預設站點設定
- **THEN** `showAbout` 為 `false`，`aboutTitle`/`aboutContent` 為 null，`aboutAllowRawHtml`/`aboutShowRawHtmlToc` 為 `false`

#### Scenario: Migration is backward compatible

- **GIVEN** 既有資料庫已存在 `SiteSetting` 列
- **WHEN** 套用新增 About 欄位的 migration
- **THEN** 既有列以預設值補齊 About 欄位，且既有欄位值與行為不受影響

### Requirement: About Content Persisted Independently Of General Settings

系統 SHALL 允許只更新「關於我」內容欄位（`aboutTitle`/`aboutContent`/`aboutAllowRawHtml`/`aboutShowRawHtmlToc`）
而不覆寫其他站點設定欄位；一般設定的整包更新 SHALL 不覆寫「關於我」內容欄位。此分離用以避免兩個後台表單互相 clobber。

#### Scenario: Editing about content leaves other settings untouched

- **GIVEN** 站台已設定 `siteName` 與 `showBlogLink`
- **WHEN** 後台僅透過「關於我」內容路徑更新 `aboutContent`
- **THEN** `siteName` 與 `showBlogLink` 維持原值，僅 `aboutContent` 被更新

#### Scenario: Saving general settings does not clobber about content

- **GIVEN** `aboutContent` 已有內容
- **WHEN** 後台透過一般站點設定表單更新（例如切換 `showAbout`）
- **THEN** `aboutContent` 維持原值不被清空


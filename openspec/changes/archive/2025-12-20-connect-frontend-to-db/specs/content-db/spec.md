## ADDED Requirements

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

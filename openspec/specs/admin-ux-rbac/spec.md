# admin-ux-rbac Specification

## Purpose
定義後台管理體驗與角色權限控管的需求，涵蓋編輯器 HTML 原始碼模式切換、側邊欄簡化與響應式版面、可設定的角色權限、文章預覽彈窗，以及前台管理連結、帳號資訊與載入狀態呈現。
## Requirements
### Requirement: Editor Can Toggle HTML Source Mode
後台文章表單 SHALL 清楚區分兩個層級：文章層級的互斥「視覺編輯器／原始 HTML」撰寫模式，以及只在
視覺編輯器內使用的進階 source view。進階 source view SHALL 使用不同於「原始 HTML 模式」的名稱與說明，
且 SHALL NOT 改變文章的 `allowRawHtml` 或消毒策略。文章層級模式 selector 的每個 hit target SHALL 至少 44px 高，並 SHALL 在可能丟失 HTML 結構或樣式的切換前顯示不可逆風險、取得確認並保留尚未儲存草稿。

#### Scenario: Toggle visual content source and back
- **GIVEN** 管理員的文章撰寫模式為「視覺編輯器」
- **WHEN** 管理員切換到「視覺內容原始碼」、修改內容再切回視覺畫面
- **THEN** 視覺畫面顯示的內容 SHALL 與原始碼一致
- **AND** 文章的 `allowRawHtml` SHALL 維持 `false`

#### Scenario: Select raw HTML authoring mode
- **WHEN** 管理員將文章撰寫模式切換為「原始 HTML」
- **THEN** 系統 SHALL 卸載 TipTap 並顯示純文字 HTML 編輯區
- **AND** 該控制 SHALL 與 TipTap 的進階 source view 有不同標籤與說明

#### Scenario: Mode controls expose accessible state
- **WHEN** 螢幕閱讀器或鍵盤使用者操作文章撰寫模式
- **THEN** 控制項 SHALL 暴露互斥選擇語意、目前選取狀態與可辨識名稱
- **AND** SHALL 支援標準鍵盤選擇操作

#### Scenario: Cancelling a lossy mode switch keeps the draft
- **GIVEN** 管理員已編輯尚未儲存內容
- **WHEN** 模式切換警告出現且管理員取消
- **THEN** 目前撰寫模式與草稿 SHALL 維持不變

### Requirement: Admin Sidebar Simplified
後台側邊欄 SHALL 不提供「新增文章」捷徑，並提供開啟前台的新分頁入口。

#### Scenario: Sidebar has frontend link
- **WHEN** 管理者檢視後台側邊欄
- **THEN** 存在「前台」入口且會以新分頁開啟

### Requirement: Configurable Role Permissions
系統 SHALL 提供可配置的角色權限矩陣，並用於控管 API 與後台頁面存取。

#### Scenario: Editor cannot manage tags
- **GIVEN** EDITOR 權限矩陣不含管理標籤
- **WHEN** EDITOR 嘗試呼叫標籤修改型 API
- **THEN** 系統拒絕

### Requirement: Post Preview Popup
後台文章編輯頁 SHALL 提供前台預覽 popup，且可預覽草稿內容。預覽 SHALL 使用文章最近成功儲存的
`allowRawHtml` 與 `showRawHtmlToc`，並套用與正式文章相同的隔離、寬版布局及目錄規則。表單存在未儲存變更時，系統 SHALL 提供「儲存並預覽」流程，只有儲存成功才開啟預覽；儲存失敗 SHALL 保留表單內容並顯示錯誤。

#### Scenario: Preview draft post
- **GIVEN** 文章狀態為 DRAFT
- **WHEN** 管理者點擊預覽
- **THEN** 新視窗顯示文章前台呈現結果

#### Scenario: Preview preserves raw HTML presentation settings
- **GIVEN** 草稿文章的 `allowRawHtml = true`
- **WHEN** 管理者開啟預覽
- **THEN** 預覽 SHALL 使用隔離 raw HTML iframe 與寬版內容布局
- **AND** 系統目錄可見性 SHALL 符合該文章的 `showRawHtmlToc`

#### Scenario: Dirty form saves before preview
- **GIVEN** 管理員修改撰寫模式、目錄偏好或內容但尚未儲存
- **WHEN** 管理員選擇預覽
- **THEN** 系統 SHALL 明確要求先儲存並提供「儲存並預覽」操作
- **AND** 只有儲存成功後才 SHALL 開啟使用最新資料的預覽

#### Scenario: Failed save does not open stale preview
- **GIVEN** 管理員的表單含未儲存變更
- **WHEN** 「儲存並預覽」失敗
- **THEN** 系統 SHALL 保留表單內容、顯示可恢復錯誤且 SHALL NOT 開啟舊資料預覽

### Requirement: Frontend Admin Link And Account Info
前台導覽 SHALL 僅在登入的管理者可見後台入口，並以一致的帳號控制區塊顯示帳號與角色資訊，且提供一致風格的登出確認流程。

#### Scenario: Logged out user does not see admin entry
- **WHEN** 使用者未登入
- **THEN** 前台不顯示後台入口與帳號資訊

#### Scenario: Logged in admin sees account control
- **WHEN** 管理者登入前台
- **THEN** 導覽列顯示一致的帳號區塊，包含帳號、角色與後台/登出入口

#### Scenario: Sign-out confirmation matches site UI
- **WHEN** 管理者點擊登出
- **THEN** 系統顯示符合站點設計語言的登出確認介面並於確認後完成登出

### Requirement: Admin Sidebar Responsive Layout
後台側邊欄與主版面 SHALL 在行動裝置寬度下維持可操作性：側邊欄於窄螢幕收合，並提供展開/收合的觸發入口；主內容區的留白間距 SHALL 隨螢幕寬度斷點調整，不得在手機寬度下固定佔用過大留白。

#### Scenario: Sidebar collapses on mobile width
- **WHEN** 管理者以手機寬度（375px 或更窄）檢視後台頁面
- **THEN** 固定寬度側邊欄不直接佔用版面，改為可透過觸發入口（如 hamburger 按鈕）展開的抽屜選單

#### Scenario: Sidebar remains visible on desktop
- **WHEN** 管理者以桌面寬度（md 斷點以上）檢視後台頁面
- **THEN** 側邊欄維持固定顯示，不需額外操作即可看到全部導覽項目

#### Scenario: Main content padding adapts to breakpoint
- **WHEN** 管理者以手機寬度檢視後台頁面
- **THEN** 主內容區 padding 縮小以保留更多可用內容寬度，桌面寬度則維持原有較大留白

### Requirement: Admin Loading State
後台 (admin) route group SHALL 提供有樣式的載入中畫面，取代瀏覽器/框架預設的無樣式載入畫面。

#### Scenario: Loading state shown while admin page data resolves
- **WHEN** 管理者導覽至任一後台頁面且該頁面資料尚未就緒
- **THEN** 系統顯示符合後台版面風格的載入中畫面，而非空白或無樣式畫面

### Requirement: Post Editing Information Hierarchy
後台文章新增與編輯頁 SHALL 將內容撰寫與文章設定分成可掃讀的資訊層級；桌面以主要內容欄搭配設定欄呈現，
行動版則依合理的閱讀與鍵盤順序堆疊為單欄。現有文章欄位與操作 SHALL 全數保留。版面 SHALL 沿用現有站點字型、色彩 token、
Button、Field、Card、邊框、圓角與 focus 樣式，不建立新的視覺語言。

#### Scenario: Desktop emphasizes authoring content
- **WHEN** 管理員以桌面寬度編輯文章
- **THEN** 標題、摘要、撰寫模式、媒體控制與內容編輯器 SHALL 位於主要內容欄
- **AND** 發佈、分類標籤、封面、精選、閱讀時間與 SEO SHALL 組織於設定欄

#### Scenario: Primary actions remain discoverable
- **WHEN** 管理員編輯長篇文章並捲動頁面
- **THEN** 返回、預覽、儲存、儲存中狀態與錯誤回饋 SHALL 集中於一致且可持續發現的 action area

#### Scenario: Mobile form becomes one operable column
- **WHEN** 管理員以手機寬度編輯文章
- **THEN** 主要內容與設定面板 SHALL 依 DOM 順序堆疊為單欄
- **AND** 不得產生頁面水平捲動或遮住主要操作

#### Scenario: Keyboard users can operate the complete form
- **WHEN** 管理員只使用鍵盤操作文章表單
- **THEN** 撰寫模式、媒體控制、所有欄位、預覽與儲存 SHALL 依可理解順序取得焦點
- **AND** 任何功能不得只依賴 hover 或拖曳

#### Scenario: Authoring mode targets meet touch size
- **WHEN** 管理員以觸控或鍵盤操作撰寫模式 selector
- **THEN** 每個互動 hit target SHALL 至少 44px 高
- **AND** SHALL 顯示現有設計系統的 focus 狀態

### Requirement: About Page Visibility Toggle In Site Settings

系統 SHALL 於既有 `/admin/settings`「功能開關」區提供一個「顯示『關於我』」開關，對應 `SiteSetting.showAbout`，
沿用既有整包 `PUT /api/site-settings` 儲存路徑與 `settings:manage` 權限。

#### Scenario: Toggle about page visibility from settings

- **GIVEN** 具備 `settings:manage` 權限的管理者位於站點設定頁
- **WHEN** 勾選或取消「顯示『關於我』」並儲存
- **THEN** `SiteSetting.showAbout` 對應更新為 `true` 或 `false`

### Requirement: Conditional About Edit Entry In Admin Sidebar

系統 SHALL 僅在 `showAbout` 為 `true` 時，於後台側欄顯示「關於我」選單項，連向 `/admin/about`；
當 `showAbout` 為 `false` 時，側欄 MUST NOT 顯示該選單項。

#### Scenario: About menu item appears only when enabled

- **GIVEN** `showAbout` 為 `true`
- **WHEN** 管理者檢視後台側欄
- **THEN** 側欄顯示「關於我」選單項，其連結指向 `/admin/about`

#### Scenario: About menu item hidden when disabled

- **GIVEN** `showAbout` 為 `false`
- **WHEN** 管理者檢視後台側欄
- **THEN** 側欄不顯示「關於我」選單項

### Requirement: About Editor Page Is Permission Gated

系統 SHALL 以 `settings:manage` 權限守衛 `/admin/about` 編輯頁；未具該權限者 SHALL 被導離（重導至 `/admin`）。

#### Scenario: Unauthorized user cannot access about editor

- **GIVEN** 一位不具 `settings:manage` 權限的登入使用者
- **WHEN** 該使用者存取 `/admin/about`
- **THEN** 系統將其重導至 `/admin`，不顯示編輯內容


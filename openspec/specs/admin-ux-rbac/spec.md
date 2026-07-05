# admin-ux-rbac Specification

## Purpose
定義後台管理體驗與角色權限控管的需求，涵蓋編輯器 HTML 原始碼模式切換、側邊欄簡化與響應式版面、可設定的角色權限、文章預覽彈窗，以及前台管理連結、帳號資訊與載入狀態呈現。
## Requirements
### Requirement: Editor Can Toggle HTML Source Mode
後台文章編輯器 SHALL 提供按鈕切換至 HTML 原始碼模式以直接編輯內容。

#### Scenario: Toggle to HTML and back
- **WHEN** 編輯器切換到 HTML 模式並修改內容再切回視覺模式
- **THEN** 視覺模式顯示內容與 HTML 一致

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
後台文章編輯頁 SHALL 提供前台預覽（popup），且可預覽草稿內容。

#### Scenario: Preview draft post
- **GIVEN** 文章狀態為 DRAFT
- **WHEN** 管理者點擊預覽
- **THEN** 新視窗顯示文章前台呈現結果

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


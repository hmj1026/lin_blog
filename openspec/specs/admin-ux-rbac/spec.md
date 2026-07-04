# admin-ux-rbac Specification

## Purpose
TBD - created by archiving change enhance-admin-ux-and-rbac. Update Purpose after archive.
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
前台導覽 SHALL 僅在登入的管理者可見後台入口，並顯示目前登入帳號與角色且可登出。

#### Scenario: Logged out user does not see admin entry
- **WHEN** 使用者未登入
- **THEN** 前台不顯示後台入口與帳號資訊


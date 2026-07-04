# admin-crud Specification

## Purpose
TBD - created by archiving change expand-admin-crud. Update Purpose after archive.
## Requirements
### Requirement: Admin Can Manage Categories
系統 SHALL 提供後台介面管理文章分類（列表、新增、編輯、刪除）並支援導覽列顯示設定與排序。

#### Scenario: Admin updates nav categories
- **GIVEN** 管理員已登入
- **WHEN** 在分類管理頁調整 `showInNav/navOrder`
- **THEN** 前台導覽列顯示內容依設定更新

### Requirement: Admin Can Manage Tags
系統 SHALL 提供後台介面管理標籤（列表、新增、編輯、刪除）。

#### Scenario: Admin adds a new tag
- **WHEN** 管理員新增一個標籤
- **THEN** 新標籤可在文章編輯時被選取

### Requirement: Admin Can Manage Users And Roles
系統 SHALL 提供後台介面管理使用者（列表、新增、編輯），並能設定使用者角色。

#### Scenario: Admin creates a user with role
- **WHEN** 管理員建立新使用者並選擇角色
- **THEN** 新使用者可使用帳密登入且具有對應角色

### Requirement: Cover Image Upload In Admin
系統 SHALL 支援在後台上傳文章封面圖片並儲存相對路徑到 `Post.coverImage`。

#### Scenario: Admin uploads cover and sees it on frontend
- **WHEN** 管理員上傳封面並發布文章
- **THEN** 前台文章列表/詳情顯示封面圖片

### Requirement: Admin-Only Mutation APIs
系統 SHALL 限制所有修改型 API（POST/PUT/DELETE）僅 ADMIN 可呼叫。

#### Scenario: Non-admin cannot mutate resources
- **GIVEN** 使用者不是 ADMIN
- **WHEN** 呼叫任一修改型 API
- **THEN** 回傳未授權/禁止存取


# admin-crud Specification

## Purpose
定義後台管理介面的 CRUD 功能需求，包括分類、標籤、使用者與角色的管理、封面圖片上傳，以及僅限管理員存取的變更型 API 與表單、資料表的無障礙與版面呈現規範。
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


### Requirement: Admin Form Input Label Association
後台管理表單（含站台設定表單）的每個輸入欄位 SHALL 與其說明文字建立可被輔助科技辨識的關聯：文字類 label SHALL 透過 `htmlFor`/`id` 配對或以 label 包裹輸入元素的方式關聯對應輸入；無獨立文字說明、僅以 placeholder 呈現用途的輸入欄位 SHALL 提供 `aria-label` 說明其用途。

#### Scenario: Text label associates with its input via htmlFor/id or wrapping
- **WHEN** 站台設定表單渲染一組帶有文字說明的輸入欄位
- **THEN** 該說明文字的 `label` 元素透過 `htmlFor` 對應輸入的 `id`，或直接包裹該輸入元素

#### Scenario: Placeholder-only input has an accessible name
- **WHEN** 站台設定表單渲染社群連結輸入（Facebook/Instagram/Threads/LINE 等僅以 placeholder 提示用途的欄位）
- **THEN** 該輸入元素具備 `aria-label`，讓螢幕閱讀器使用者可辨識欄位用途

### Requirement: Admin Data Table Horizontal Overflow
後台資料表格（列表頁使用的共用 table 元件）的容器 SHALL 在內容寬度超出可視區域時提供水平捲動，而非直接裁切內容。

#### Scenario: Table content scrolls on narrow viewport
- **WHEN** 管理者以窄螢幕（表格內容寬度超過可視寬度）檢視後台列表頁的資料表格
- **THEN** 表格容器可透過水平捲動查看被遮蔽的欄位，內容不會被直接裁切而無法讀取

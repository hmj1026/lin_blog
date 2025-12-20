## ADDED Requirements

### Requirement: Post Analytics Event Browser
系統 SHALL 提供「文章統計事件明細」頁面，讓具備權限的管理者可檢視單筆瀏覽事件（包含 UA / IP）並進行篩選與分頁。

#### Scenario: View events for a post with filters
- **GIVEN** 管理者具有 `analytics:view_sensitive` 權限
- **WHEN** 管理者在事件明細頁設定 `deviceType=MOBILE`、`ipMode=equals` 並輸入 IP，且輸入 UA 關鍵字
- **THEN** 系統只顯示符合條件的事件，並支援分頁瀏覽

### Requirement: Sensitive Fields Are Permission-Gated
系統 SHALL 以權限控管事件明細頁與敏感欄位（UA / IP），僅允許具備 `analytics:view_sensitive` 的角色存取。

#### Scenario: Editor cannot access event browser
- **GIVEN** 使用者僅具有 `analytics:view` 權限
- **WHEN** 使用者嘗試進入事件明細頁
- **THEN** 系統拒絕存取並導回 admin 首頁（或等價處理）

### Requirement: Link From Aggregation To Event Details
系統 SHALL 在「文章統計彙總」頁提供「查看事件」動作，導向對應文章的事件明細頁。

#### Scenario: Navigate from aggregation row to event list
- **GIVEN** 管理者正在文章統計彙總頁
- **WHEN** 點擊某篇文章的「查看事件」
- **THEN** 導向事件明細頁且可看到該文章事件列表

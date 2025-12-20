## Why
目前「文章統計」僅提供彙總數字，無法回溯單筆事件、檢視 UA / IP 等資訊，也無法以條件（時間/IP/UA/裝置）篩選以便排查流量品質與來源。需要提供一個可篩選的事件瀏覽器（event browser）來支援分析與除錯。

## What Changes
- 新增「文章統計事件明細」頁面：可檢視某篇文章的 `PostViewEvent` 清單（含 `viewedAt`、`ip`、`userAgent`、`referer`、`acceptLanguage`、`deviceType`）。
- 提供篩選功能（以 query string 驅動）：
  - 時間範圍（from/to 或 days）
  - `deviceType`
  - `ip`（contains / equals）
  - `userAgent`（contains）
  - `referer`（contains）
- 提供分頁（page/pageSize），避免一次載入過多事件。
- 既有「文章統計」彙總頁加上「查看事件」連結，跳轉到事件明細頁。
- 以逐步導入方式，新增 `Analytics` 領域模組（DDD + repository/use case），先把統計讀取邏輯集中到 repository，UI 改呼叫 use case。

## Security / Privacy Notes
- 事件明細包含 IP/UA 屬於敏感資訊，預設仍沿用現有權限 `analytics:view`（目前 EDITOR 也可看）。
- 本提案新增 `analytics:view_sensitive` 權限，事件明細頁面與 UA/IP 欄位僅允許具備該權限的角色（預設只給 ADMIN）。

## Impact
- Affected code: `web/src/app/(admin)/admin/analytics/**`, `web/src/modules/**`（新增 analytics 模組）
- Affected specs: 新增 `post-analytics-event-browser`（本變更提案內定義）

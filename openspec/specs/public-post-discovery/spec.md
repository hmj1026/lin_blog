# public-post-discovery Specification

## Purpose
TBD - created by archiving change add-reader-discovery-and-subscriptions. Update Purpose after archive.
## Requirements
### Requirement: Public Post Search
系統 SHALL 提供站內文章搜尋，僅以已發佈且未刪除文章的標題與摘要比對經 trim 的查詢字串，並以
`/search?q=<query>` 呈現有界分頁結果。搜尋結果 SHALL 只包含公開展示需要的安全欄位，不得回傳草稿、
已刪除文章、文章完整內容或管理端欄位。

#### Scenario: Search from the article discovery module
- **GIVEN** 訪客在文章頁的站內搜尋框輸入含前後空白的關鍵字
- **WHEN** 訪客送出搜尋
- **THEN** 系統導向 `/search?q=<trimmed-and-encoded-query>`，並顯示匹配標題或摘要的已發佈文章

#### Scenario: Search excludes non-public posts
- **GIVEN** 草稿、已刪除文章或未到發佈時間的文章含有相同關鍵字
- **WHEN** 訪客執行站內搜尋
- **THEN** 搜尋結果不包含這些非公開文章，且回應不洩漏其存在或內容

#### Scenario: Paginated results preserve the query
- **GIVEN** 搜尋結果超過單頁上限
- **WHEN** 訪客切換結果頁次
- **THEN** 系統保留原查詢字串、套用有界頁碼與每頁筆數，並以穩定次序顯示結果

#### Scenario: Empty search result remains usable
- **WHEN** 沒有任何公開文章符合查詢
- **THEN** 系統顯示明確空結果訊息及可再次搜尋的控制項，而非錯誤頁面

#### Scenario: Empty query does not list every post
- **GIVEN** 訪客未輸入內容或只輸入空白
- **WHEN** 訪客送出文章頁搜尋表單
- **THEN** 系統 SHALL 留在目前文章頁、顯示可存取的輸入提示且 SHALL NOT 導向搜尋頁或列出全部文章

### Requirement: Public Popular Posts Ranking
系統 SHALL 依最近 30 日的有效文章瀏覽事件產生最多 5 篇公開熱門文章排行，只包含已發佈且未刪除文章，並以
瀏覽數由高至低、發佈時間由新至舊及穩定識別欄位作為決勝排序。排行回傳筆數 SHALL 有上限，且不得
使用或暴露個別訪客事件資料。

#### Scenario: Rank posts by valid views from the last 30 days
- **GIVEN** 多篇公開文章在最近 30 日具有有效瀏覽事件
- **WHEN** 訪客載入熱門文章模組
- **THEN** 系統依 30 日瀏覽數由高至低顯示文章，並只回傳公開文章摘要資料

#### Scenario: Exclude stale and non-public data
- **GIVEN** 瀏覽事件早於 30 日，或其文章已成為草稿或被刪除
- **WHEN** 系統建立公開熱門排行
- **THEN** 這些事件或文章不計入可顯示的排行

#### Scenario: Popular ranking uses deterministic tie-breaking
- **GIVEN** 兩篇文章在 30 日內的有效瀏覽數相同
- **WHEN** 系統多次查詢熱門排行且資料未變
- **THEN** 系統依發佈時間與穩定識別欄位維持相同順序，不發生無資料變更的跳動

#### Scenario: Latest posts fill an incomplete popular list
- **GIVEN** 符合條件的熱門文章少於模組上限或完全沒有瀏覽資料
- **WHEN** 系統建立熱門文章模組
- **THEN** 系統以最新公開文章補足且不重複已存在文章；若公開文章總數仍不足則顯示實際可用筆數

### Requirement: Public Latest Posts
系統 SHALL 提供最多 5 篇的最新文章列表，只包含已發佈且未刪除文章，依發佈時間由新至舊及穩定識別欄位
排序，並回傳公開展示所需的最小資料。

#### Scenario: Latest module shows newest public posts
- **WHEN** 訪客載入最新文章模組
- **THEN** 系統依發佈時間由新至舊顯示有上限的公開文章列表

#### Scenario: Latest module handles insufficient data
- **GIVEN** 公開文章數量少於模組上限或為零
- **WHEN** 訪客載入最新文章模組
- **THEN** 系統顯示實際可用文章或明確空狀態，不以不存在的項目補位也不使文章頁失敗

### Requirement: Responsive Article Discovery Placement
系統 SHALL 在一般文章桌面版以內容優先的約 280–320px sticky 右側欄，依序顯示站內搜尋、訂閱、
最多 5 篇熱門文章與最多 5 篇最新文章；側欄 SHALL 避開全站 header 且不得截斷可聚焦內容。在
手機與平板將相同模組移至文章內容後方。對 `allowRawHtml = true` 的寬版文章，系統 SHALL 保持文章
iframe 的可用寬度，並將探索模組放在內容後方的 responsive grid，不得以雙欄容器限縮使用者 HTML。
所有探索模組 SHALL 沿用站台既有 design tokens、字體與色盤。

#### Scenario: Standard desktop post uses a discovery sidebar
- **GIVEN** 一篇非原始 HTML 文章以桌面寬度顯示
- **WHEN** 訪客開啟文章詳情
- **THEN** 主文與約 280–320px 的 sticky 右側探索欄並排，且探索模組依搜尋、訂閱、熱門 5 篇、
  最新 5 篇的順序呈現

#### Scenario: Narrow viewport moves discovery after content
- **GIVEN** 一篇文章以手機或平板寬度顯示
- **WHEN** 訪客閱讀到文章內容結束
- **THEN** 探索模組於內容後方依序呈現，不遮擋、不產生水平捲動且可由鍵盤操作

#### Scenario: Raw HTML post preserves the wide layout
- **GIVEN** 一篇 `allowRawHtml = true` 的文章
- **WHEN** 訪客以桌面寬度開啟文章詳情
- **THEN** 原始 HTML iframe 維持寬版可用寬度，探索模組在 iframe 後方以 responsive grid 獨立呈現
  而不進入右側欄 grid

#### Scenario: Discovery modules preserve the existing visual language
- **WHEN** 一般或原始 HTML 文章呈現探索模組
- **THEN** 模組沿用現有 design tokens、字體、色盤、間距與互動狀態，不建立另一套視覺主題

### Requirement: Discovery Failure Isolation
系統 SHALL 將探索資料的錯誤與文章主內容隔離；搜尋、熱門或最新資料暫時不可用時，文章詳情仍須
正常顯示，受影響模組則呈現可理解的空或錯誤狀態。所有探索控制項 SHALL 具有可見焦點、可存取名稱
與鍵盤操作能力。

#### Scenario: Discovery query failure does not fail the post
- **GIVEN** 熱門或最新文章查詢暫時失敗
- **WHEN** 訪客開啟一篇可正常讀取的文章
- **THEN** 文章主內容仍正常顯示，受影響模組呈現泛化錯誤狀態且不洩漏內部錯誤

#### Scenario: Discovery controls are keyboard accessible
- **WHEN** 訪客只使用鍵盤操作搜尋與文章連結
- **THEN** 所有互動元素皆可依合理順序取得焦點、顯示焦點狀態並提供可存取名稱


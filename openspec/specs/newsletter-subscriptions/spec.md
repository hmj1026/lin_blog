# newsletter-subscriptions Specification

## Purpose
TBD - created by archiving change add-reader-discovery-and-subscriptions. Update Purpose after archive.
## Requirements
### Requirement: Persistent Newsletter Subscription
系統 SHALL 以獨立訂閱資料模型儲存姓名、正規化後的 Email 及建立/更新時間。姓名與 Email 必填，Email
SHALL 先 trim 並轉為小寫後再套用資料庫唯一約束；公開訂閱 API 不得保存 CAPTCHA token、secret、
來源 IP 或其他非必要請求內容。

#### Scenario: Valid new subscriber is persisted
- **GIVEN** 訪客提供有效的姓名、Email 並通過 CAPTCHA 與限流
- **WHEN** 訪客送出訂閱
- **THEN** 系統儲存一筆正規化 Email 唯一的訂閱資料並回傳泛化成功結果

#### Scenario: Invalid subscriber input is rejected
- **GIVEN** 姓名為空白或 Email 格式無效
- **WHEN** 訪客送出訂閱
- **THEN** 系統回傳欄位驗證錯誤，且不建立訂閱資料

#### Scenario: Concurrent duplicate submissions remain unique
- **GIVEN** 相同 Email 的兩個有效請求同時送達
- **WHEN** 系統嘗試建立訂閱資料
- **THEN** 資料庫唯一約束確保最多只有一筆訂閱資料，兩個請求皆不洩漏 Email 是否已存在

### Requirement: Idempotent And Non-Enumerating Subscription Response
系統 SHALL 對首次成功與已存在 Email 的重複訂閱回傳相同的成功狀態與泛化訊息。重複訂閱不得更新
既有姓名或建立額外資料，亦不得透過狀態碼、訊息或可觀察回應差異揭露 Email 是否已訂閱。

#### Scenario: Duplicate email receives the generic success response
- **GIVEN** 正規化後的 Email 已存在
- **WHEN** 訪客以有效 CAPTCHA 再次送出訂閱
- **THEN** 系統不新增或修改資料，並回傳與首次成功相同的泛化成功結果

#### Scenario: Case and surrounding spaces do not bypass uniqueness
- **GIVEN** 已存在 `reader@example.com`
- **WHEN** 訪客送出 ` Reader@Example.com `
- **THEN** 系統將其視為相同 Email，維持單筆資料並回傳泛化成功結果

### Requirement: Server-Verified reCAPTCHA v2
系統 SHALL 在訂閱表單使用 Google reCAPTCHA v2 checkbox，並由伺服器使用 server-only secret 驗證
token 與允許的 hostname。只有驗證成功的請求才可寫入訂閱資料；缺少設定、token 遺失、provider
逾時、hostname 不符或驗證失敗時 SHALL fail closed。public site key 可提供前端使用，secret 不得傳至
瀏覽器或出現在回應及日誌。

前端 widget 初始化 SHALL 具備韌性：系統 SHALL 於 `grecaptcha.render` 確實可呼叫後才執行渲染
（不得僅以 `window.grecaptcha` 物件存在為依據——loader stub 於 release script 載完前即存在）。
系統 SHALL 優先使用 `grecaptcha.ready()` 並以有界 polling/deadline 作為備援；ready callback
不存在、不回呼或 `render` 在 deadline 前仍不可用時 SHALL 進入失敗流程。widget 渲染呼叫失敗
（拋出例外）時 SHALL 呈現與 script 載入失敗相同的可恢復重新載入 UI，不得留下空白 widget
的靜默失敗狀態。retry、unmount 與多個表單 instance 共用 script 時 SHALL 清理 stale callback
與 timer,不得重複 render 或清除其他 instance 已成功的 widget。

#### Scenario: Successful checkbox verification permits subscription
- **GIVEN** 訪客完成 reCAPTCHA v2 checkbox 且 Google 回傳成功及允許的 hostname
- **WHEN** 其他輸入與限流檢查也通過
- **THEN** 系統繼續執行訂閱建立或冪等成功流程

#### Scenario: Missing or invalid CAPTCHA prevents persistence
- **GIVEN** CAPTCHA token 缺少、無效、過期或 hostname 不符
- **WHEN** 訪客送出訂閱
- **THEN** 系統回傳可恢復的泛化驗證錯誤且不寫入資料庫

#### Scenario: CAPTCHA configuration or provider failure fails closed
- **GIVEN** site key/secret 未設定，或 Google 驗證服務逾時或失敗
- **WHEN** 訪客嘗試訂閱
- **THEN** 系統不建立訂閱資料，並顯示可稍後重試但不洩漏內部設定的訊息

#### Scenario: Widget renders only after grecaptcha.render is available
- **GIVEN** Google api.js loader stub 已載入（`window.grecaptcha` 存在）但 release script 尚未載完（`grecaptcha.render` 尚未定義）
- **WHEN** 表單初始化 CAPTCHA widget
- **THEN** 系統等待 `grecaptcha.render` 可呼叫後才渲染 widget，訪客最終可見並可完成 checkbox

#### Scenario: Widget render failure surfaces recoverable UI
- **GIVEN** `grecaptcha.render` 呼叫拋出例外（例如 provider 錯誤）
- **WHEN** 表單初始化 CAPTCHA widget
- **THEN** 系統呈現可恢復的「重新載入驗證」UI 與說明文字，不留下空白 widget，且重新載入入口可重試整個初始化流程

#### Scenario: Widget readiness has a bounded fallback
- **GIVEN** `window.grecaptcha` 已存在但 `ready` 不存在、ready callback 不回呼或 `render` 持續不是 function
- **WHEN** 表單初始化 CAPTCHA widget 且等待超過 readiness deadline
- **THEN** 系統呈現可恢復的「重新載入驗證」UI，不無限輪詢、不留下空白 widget，且不拋出未處理例外

#### Scenario: Retry and unmount invalidate stale initialization
- **GIVEN** 表單在 CAPTCHA readiness 等待期間被 unmount 或使用者觸發重新載入驗證
- **WHEN** 舊的 ready/polling callback 之後執行
- **THEN** 舊 callback 不得 render widget、改寫新的狀態或清除其他 instance 的 widget

### Requirement: Newsletter-Specific Rate Limiting
系統 SHALL 在廉價輸入格式驗證後、呼叫 CAPTCHA provider 與資料庫前，對公開訂閱 API 套用獨立且可設定的限流政策。
預設門檻 SHALL 為同一來源雜湊每 10 分鐘最多 5 次；有效設定可覆寫此值，無效或非正整數設定 SHALL fail fast。超過
門檻時 SHALL 回傳 `429` 與 `Retry-After`，不得繼續外部驗證或資料寫入。限流與日誌使用的請求來源
識別不得保存原始 IP 或完整 Email。

#### Scenario: Requests within the limit proceed
- **GIVEN** 請求來源尚未超過訂閱端點的設定門檻
- **WHEN** 訪客送出訂閱
- **THEN** 系統允許已通過格式驗證的請求繼續進行 CAPTCHA 驗證

#### Scenario: Default policy is measurable
- **GIVEN** 未覆寫訂閱限流設定
- **WHEN** 同一來源雜湊在 10 分鐘視窗內送出請求
- **THEN** 前 5 次可依序進入後續驗證，第 6 次 SHALL 回傳 `429` 與正確 `Retry-After`

#### Scenario: Excessive requests are stopped before external work
- **GIVEN** 請求來源已超過訂閱端點的設定門檻
- **WHEN** 再次送出訂閱
- **THEN** 系統回傳 `429` 與 `Retry-After`，且不呼叫 Google、不查詢或寫入訂閱資料

### Requirement: Authorized Subscriber Administration
系統 SHALL 提供受 `subscribers:view` 權限保護的後台訂閱者名單，該權限預設僅授予 ADMIN。名單 SHALL 支援有界
分頁、姓名/Email 搜尋及建立時間檢視，並只回傳管理頁必要的安全 DTO；未授權使用者不得透過頁面或
API 得知任何訂閱者資料。`subscribers:view` 權限及其 ADMIN 授權 SHALL 由資料庫遷移（data migration）
於標準升級流程（schema migration deploy）中冪等佈建，並使既有工作階段的權限快取失效，不得依賴
人工重跑初始化腳本。

#### Scenario: Authorized admin views subscribers
- **GIVEN** 管理者具備 `subscribers:view` 權限
- **WHEN** 開啟後台訂閱者頁面
- **THEN** 系統依建立時間顯示有界分頁的姓名、Email 與建立時間，並提供載入及空狀態

#### Scenario: Admin searches by name or email
- **GIVEN** 管理者具備 `subscribers:view` 權限
- **WHEN** 以姓名或 Email 關鍵字搜尋
- **THEN** 系統顯示匹配的有界分頁結果並保留查詢條件

#### Scenario: Unauthorized access reveals no subscriber data
- **GIVEN** 使用者未登入或缺少訂閱者讀取權限
- **WHEN** 嘗試開啟訂閱者頁面或呼叫其 API
- **THEN** 系統拒絕存取，且回應不包含姓名、Email、總筆數或可推知資料存在的資訊

#### Scenario: Upgrade provisions the subscriber permission without manual bootstrap
- **GIVEN** 既有生產資料庫由前一版本升級，僅執行標準 schema migration 部署流程
- **WHEN** 升級完成後 ADMIN 使用者以既有工作階段開啟後台訂閱者頁面
- **THEN** 系統於權限快取刷新後允許存取訂閱者名單，不將使用者重新導向後台首頁，且不需人工執行初始化腳本

#### Scenario: Permission provisioning migration is idempotent
- **GIVEN** `subscribers:view` 權限或其 ADMIN 授權已存在（如曾執行初始化腳本的環境）
- **WHEN** 佈建遷移再次執行
- **THEN** 遷移 SHALL 成功完成且不產生重複資料或唯一約束錯誤

### Requirement: Subscriber Privacy And Safe Logging
系統 SHALL 僅收集本期功能必要的訂閱資料，且應用日誌不得記錄 CAPTCHA token、secret、完整姓名、
完整 Email、原始 IP 或完整 request body。可觀測性資料僅得包含 request id、結果類型、泛化錯誤碼及
不可逆或遮罩後的識別；後台名單不得顯示 CAPTCHA、限流或來源資訊。

#### Scenario: Sensitive subscription fields are absent from logs
- **WHEN** 訂閱成功、重複、驗證失敗或 provider 發生錯誤
- **THEN** 日誌不包含 CAPTCHA token/secret、完整姓名、完整 Email、原始 IP 或完整請求內容

#### Scenario: Admin DTO contains only required subscriber fields
- **WHEN** 已授權管理者讀取訂閱者名單
- **THEN** 回應只包含名單所需的識別碼、姓名、Email 與時間欄位，不包含 CAPTCHA 或請求來源資料

### Requirement: Configurable Homepage Newsletter Section
系統 SHALL 以站台設定的 `showNewsletter` 開關控制首頁訂閱區塊的顯示，預設為關閉。後台站台設定頁
SHALL 對具設定管理權限的使用者暴露此開關，儲存後首頁 SHALL 依最新設定值渲染或隱藏訂閱區塊，
不需重新部署。

#### Scenario: Admin enables the homepage newsletter section
- **GIVEN** 管理者於後台站台設定頁看到「顯示 Newsletter 訂閱區塊」開關且目前為關閉
- **WHEN** 管理者開啟該開關並儲存
- **THEN** 首頁 SHALL 顯示訂閱區塊，且設定值持久化於站台設定資料

#### Scenario: Toggle off hides the homepage section
- **GIVEN** `showNewsletter` 目前為開啟
- **WHEN** 管理者關閉該開關並儲存
- **THEN** 首頁 SHALL 不渲染訂閱區塊

#### Scenario: Default keeps the section hidden
- **GIVEN** 全新環境未曾調整站台設定
- **WHEN** 訪客開啟首頁
- **THEN** 首頁不顯示訂閱區塊（預設 `false`），且後台開關可將其開啟


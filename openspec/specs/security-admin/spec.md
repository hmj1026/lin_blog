# security-admin Specification

## Purpose
TBD - created by archiving change secure-storage-soft-delete-rbac. Update Purpose after archive.
## Requirements
### Requirement: Role-Based Access Control
系統 SHALL 依角色（ADMIN/EDITOR/READER）限制後台與 API 的操作權限。

#### Scenario: Editor cannot manage users
- **GIVEN** 使用者角色為 EDITOR
- **WHEN** 嘗試存取使用者管理的修改型 API
- **THEN** 系統拒絕存取

### Requirement: Soft Delete For Core Resources
系統 SHALL 對指定資源採用軟刪除機制，刪除時不移除資料而是標記 `deletedAt`。

#### Scenario: Deleted category not shown in lists
- **WHEN** 分類被刪除（soft delete）
- **THEN** 前台/後台列表預設不顯示該分類

### Requirement: Private Storage For Uploads
系統 SHALL 將上傳檔案存放於非公開目錄，並僅透過受控端點輸出，以避免以 URL 直接存取原始檔案路徑。

#### Scenario: Upload cannot be accessed via direct public path
- **GIVEN** 檔案已上傳到 storage
- **WHEN** 使用者嘗試用 `public/` 路徑直接存取
- **THEN** 無法取得檔案內容

#### Scenario: Image is delivered via controlled endpoint
- **WHEN** 前台渲染文章內容圖片
- **THEN** 圖片來源為受控端點（例如 `/api/files/<id>`）並成功顯示

### Requirement: Cron Endpoint Fail-Closed Authorization
系統 SHALL 對排程觸發端點（例如 `/api/cron/publish-scheduled`）採用 fail-closed 驗證：當驗證所需的密鑰（`CRON_SECRET`）未設定時，系統 SHALL 拒絕請求，而非放行。

#### Scenario: Request rejected when CRON_SECRET is not configured
- **GIVEN** 環境變數 `CRON_SECRET` 未設定
- **WHEN** 任何呼叫者呼叫 cron 觸發端點（GET 或 POST）
- **THEN** 系統拒絕該請求（回傳 401 或等同的拒絕狀態），不執行排程發佈邏輯

#### Scenario: Request rejected when Authorization header does not match
- **GIVEN** 環境變數 `CRON_SECRET` 已設定
- **WHEN** 呼叫者帶著不相符的 `Authorization` header 呼叫 cron 觸發端點
- **THEN** 系統回傳 401，不執行排程發佈邏輯

#### Scenario: Request accepted when Authorization header matches
- **GIVEN** 環境變數 `CRON_SECRET` 已設定
- **WHEN** 呼叫者帶著相符的 `Authorization` header 呼叫 cron 觸發端點
- **THEN** 系統執行排程發佈邏輯並回傳成功結果

#### Scenario: POST endpoint enforces the same authorization as GET
- **GIVEN** cron 觸發端點的 POST handler 內部轉呼 GET handler 的邏輯
- **WHEN** 呼叫者對 POST 端點發出請求
- **THEN** 系統套用與 GET 端點相同的 fail-closed 驗證規則

### Requirement: CRON_SECRET Declared As Required Server Environment Variable
系統 SHALL 將 `CRON_SECRET` 納入伺服器端環境變數的 Zod schema 驗證，使其缺漏在應用程式啟動期即被偵測，而非等到 cron 端點被呼叫時才發現。

#### Scenario: Application fails to start when CRON_SECRET is missing
- **GIVEN** 部署環境未設定 `CRON_SECRET`
- **WHEN** 應用程式啟動並執行伺服器端環境變數驗證
- **THEN** 環境變數驗證 SHALL 失敗並回報 `CRON_SECRET` 缺漏

### Requirement: Generic Error Response For Unexpected Exceptions
系統 SHALL 確保 API 回應中，非受控例外（非 `ApiException`、非 Zod 驗證錯誤）的錯誤訊息不得包含內部實作細節（例如原始例外訊息、stack trace、資料庫或第三方套件錯誤內容）；此類細節僅記錄於伺服器端 log。

#### Scenario: Unexpected error returns a generic client-facing message
- **GIVEN** 某 API route handler 拋出一個非 `ApiException`、非 `ZodError` 的一般例外
- **WHEN** 該例外經過全域錯誤處理函式（`handleApiError`）處理
- **THEN** client 收到的回應 SHALL 為固定的泛化錯誤訊息與 500 狀態碼，而非該例外的原始 `message`

#### Scenario: Unexpected error is still logged with full detail server-side
- **GIVEN** 某 API route handler 拋出一個非受控的一般例外
- **WHEN** 該例外經過全域錯誤處理函式處理
- **THEN** 系統 SHALL 將完整例外訊息與 stack trace 記錄於伺服器端 log

#### Scenario: Validation errors still return field-level messages
- **GIVEN** 某 API 請求觸發 `ZodError`（輸入驗證失敗）
- **WHEN** 該例外經過全域錯誤處理函式處理
- **THEN** client 收到的回應 SHALL 包含欄位層級的驗證錯誤訊息，且不外洩底層 schema 實作細節

#### Scenario: Controlled ApiException messages are returned unchanged
- **GIVEN** 某 API route handler 拋出一個 `ApiException`（含明確設計的訊息與狀態碼）
- **WHEN** 該例外經過全域錯誤處理函式處理
- **THEN** client 收到的回應 SHALL 為該 `ApiException` 原本設計的訊息與狀態碼

### Requirement: Domain Layer For Access Control Rules
The security-admin module SHALL encapsulate role and permission validity rules in a `domain/` layer of pure functions, consistent with the other four modules (posts, media, analytics, site-settings). The infrastructure (repository) layer SHALL only return raw data and SHALL NOT contain semantic authorization judgments.

#### Scenario: Repository returns raw role data only
- **GIVEN** `web/src/modules/security-admin/infrastructure/prisma/security-admin.repository.prisma.ts` queries a role or its permissions
- **WHEN** the query completes
- **THEN** the repository SHALL return the raw `Role`/`Permission` records without evaluating soft-delete or validity state

#### Scenario: Soft-deleted role is treated as having no permission
- **GIVEN** a role has `deletedAt` set (soft-deleted)
- **WHEN** the use case checks whether that role has a given permission via `web/src/modules/security-admin/domain/rules.ts`
- **THEN** the domain rule SHALL return `false` regardless of the role's assigned permissions

#### Scenario: Permission check is unit-testable without Prisma
- **GIVEN** the domain rule functions (`isRoleActive`, `roleHasPermission`, `roleHasAnyPermission`) in `security-admin/domain/`
- **WHEN** a unit test invokes them with plain in-memory role/permission objects
- **THEN** the test SHALL pass without importing Prisma or any infrastructure code


# testing Specification

## Purpose
定義系統測試覆蓋需求，包括 Zod 驗證 schema、API 工具函數、Use Cases、以及 E2E 測試的規格與場景。
## Requirements
### Requirement: Validation Schema Unit Tests
The system SHALL have unit tests for all Zod validation schemas in `lib/validations/`.

#### Scenario: Post schema validation
- **WHEN** an invalid post payload is provided to `postSchema.parse()`
- **THEN** a ZodError is thrown with appropriate error messages

#### Scenario: Post API input parsing
- **WHEN** a valid `PostApiInput` with ISO date string is provided to `parsePostApiInput()`
- **THEN** the `publishedAt` field is converted to a `Date` object

#### Scenario: All validation schemas covered
- **GIVEN** all schemas in `lib/validations/`
- **WHEN** running unit tests
- **THEN** each schema has at least one valid and one invalid input test case

---

### Requirement: API Utilities Unit Tests
The system SHALL have unit tests for API utility functions in `lib/api-utils.ts`.

#### Scenario: jsonOk returns success response
- **WHEN** `jsonOk(data)` is called
- **THEN** it returns a `NextResponse` with `{ success: true, data }`

#### Scenario: jsonError returns error response
- **WHEN** `jsonError(message, status)` is called
- **THEN** it returns a `NextResponse` with `{ success: false, message }` and specified status code

#### Scenario: handleApiError handles ApiException
- **WHEN** `handleApiError(new ApiException("msg", 403))` is called
- **THEN** it returns `jsonError("msg", 403)`

### Requirement: Site Settings Use Cases Unit Tests
The system SHALL have unit tests for `siteSettingsUseCases` in `modules/site-settings/index.ts`.

#### Scenario: getDefault returns null when no setting exists
- **WHEN** no default site setting exists in the database
- **THEN** `getDefault()` returns `null`

#### Scenario: getOrCreateDefault creates default when not exists
- **WHEN** no default site setting exists
- **THEN** `getOrCreateDefault()` creates and returns a default setting

#### Scenario: updateDefault updates existing setting
- **WHEN** `updateDefault({ showBlogLink: false })` is called
- **THEN** the setting is updated and returned

### Requirement: SEO Utilities Unit Tests
The system SHALL have unit tests for SEO utility functions in `lib/utils/seo.ts`.

#### Scenario: SEO helper functions work correctly
- **WHEN** SEO utility functions are called with valid input
- **THEN** they return properly formatted SEO metadata

### Requirement: Cron Publish-Scheduled Route Unit Tests
The system SHALL have unit tests for `api/cron/publish-scheduled/route.ts` covering authorization and the scheduled-to-published state transition.

#### Scenario: Unauthorized request is rejected
- **WHEN** the cron endpoint is called without the required authorization (e.g. missing/invalid secret or bearer token)
- **THEN** the route returns an error response and does not perform any post state transition

#### Scenario: Scheduled posts are published
- **WHEN** the cron endpoint is called with valid authorization and one or more posts have `status = scheduled` with `publishedAt` in the past
- **THEN** those posts are transitioned to `published` and the response reports the number of posts published

#### Scenario: No due posts is a no-op
- **WHEN** the cron endpoint is called with valid authorization and no scheduled posts are due
- **THEN** the route returns a success response with zero posts published and performs no writes

### Requirement: File Access Route Unit Tests
The system SHALL have unit tests for `api/files/[id]/route.ts` covering file retrieval and visibility-based access control.

#### Scenario: Public file is accessible without authentication
- **WHEN** a request for a file with `PUBLIC` visibility is made without an authenticated session
- **THEN** the route returns the file content or metadata successfully

#### Scenario: Private file requires authorization
- **WHEN** a request for a file with non-public visibility is made without a session or permission that grants access
- **THEN** the route returns an authorization error and does not return the file content

#### Scenario: Missing file returns not found
- **WHEN** a request references a file id that does not exist
- **THEN** the route returns a not-found error response

### Requirement: Single Post Version Route Unit Tests
The system SHALL have unit tests for `api/posts/[id]/versions/[versionId]/route.ts` covering retrieval of a single version and the restore operation.

#### Scenario: Get a single version
- **WHEN** a GET request is made for an existing `versionId` belonging to the given post
- **THEN** the route returns that version's data

#### Scenario: Get a version that does not belong to the post
- **WHEN** a GET request is made with a `versionId` that does not belong to the given post id
- **THEN** the route returns a not-found or error response

#### Scenario: Restore a version writes the post content
- **WHEN** a restore request is made for a valid `versionId`
- **THEN** the post's current content is overwritten with the version's content and the write is persisted via the posts use case

### Requirement: Analytics Stats Route Unit Tests
The system SHALL have unit tests for `api/analytics/stats/route.ts` covering dashboard statistics retrieval.

#### Scenario: Authorized request returns aggregated stats
- **WHEN** an authenticated request with sufficient permission is made to the stats endpoint
- **THEN** the route returns the aggregated analytics data in the standard `ApiResponse` envelope

#### Scenario: Unauthorized request is rejected
- **WHEN** a request is made without a session or without the required permission
- **THEN** the route returns an authorization error and does not query analytics data

### Requirement: Analytics Views Route Unit Tests
The system SHALL have unit tests for `api/analytics/views/route.ts` covering view-tracking ingestion.

#### Scenario: Valid view event is recorded
- **WHEN** a POST request with a valid view-tracking payload is made
- **THEN** the route records the view event and returns a success response

#### Scenario: Invalid payload is rejected
- **WHEN** a POST request with a malformed or missing required field is made
- **THEN** the route returns a validation error response and does not record a view event

### Requirement: Uploadthing Stub Route Unit Tests
The system SHALL have a unit test for `api/uploadthing/route.ts` covering its current not-implemented stub behavior.

#### Scenario: Route returns not-implemented response
- **WHEN** any request is made to the uploadthing route in its current stub state
- **THEN** the route returns the fixed 501 not-implemented response without side effects

### Requirement: Test Coverage Gap Evaluation Record
The system SHALL maintain a documented evaluation of remaining test-coverage gaps not addressed by this change, specifically the vitest coverage threshold scope and visual-regression enablement, cross-referencing the change that owns each gap.

#### Scenario: Coverage threshold scope is cross-referenced, not duplicated
- **WHEN** reviewing this change's scope against `add-unit-test-implementation`
- **THEN** the vitest coverage threshold configuration remains solely defined in `add-unit-test-implementation` and this change does not introduce a conflicting or duplicate threshold requirement

#### Scenario: Visual regression status is recorded
- **WHEN** reviewing `tests/visual/button.spec.ts`
- **THEN** its current `it.skip` placeholder status and the evaluation conclusion on whether to wire it to real Playwright screenshot comparison are documented for a future change to act on

### Requirement: Site Settings Use Cases Unit Tests Fix
The system SHALL have working unit tests for `siteSettingsUseCases` that correctly mock Prisma upsert behavior.

#### Scenario: updateDefault correctly calls upsert
- **WHEN** `updateDefault({ showBlogLink: false })` is called
- **THEN** the Prisma upsert is called with correct `where`, `create`, and `update` parameters

---

### Requirement: Media Module Unit Tests
The system SHALL have unit tests for `modules/media` use cases.

#### Scenario: Upload validation
- **WHEN** a file exceeds size limit is uploaded
- **THEN** an error is returned

#### Scenario: File retrieval
- **WHEN** a valid file ID is requested
- **THEN** the file metadata is returned

---

### Requirement: E2E Test Coverage
The system SHALL have working E2E tests for critical user flows.

#### Scenario: Post creation flow
- **GIVEN** an authenticated admin user
- **WHEN** creating a new post through the admin interface
- **THEN** the post is saved and visible in the post list

#### Scenario: Blog viewing flow
- **WHEN** a visitor navigates to a published blog post
- **THEN** the post content and metadata are displayed correctly

### Requirement: E2E Shared Authentication Session

E2E 測試 SHALL 透過 `global-setup.ts` 既有的 admin 登入產生共用
storageState，並持久化至每次 run 產生的絕對路徑 `.auth/user.json`。產生 state
不得新增第二次 setup project 登入；寫檔前 SHALL 建立目錄，且 state 檔不得被
Git 追蹤。

只需 admin 權限且沒有公開／其他角色語意的 spec SHALL 由
`chromium-authed` project 執行，且其測試本體 SHALL NOT 重複呼叫
`loginAsAdmin()`。需要匿名、登入流程或非 ADMIN 角色的 spec SHALL 由
`chromium-anon` project 或明確的空 state 執行。

#### Scenario: 純 admin spec 重用共用登入狀態

- **GIVEN** 一支純 admin 權限的 admin CRUD spec
- **WHEN** 該 spec 執行
- **THEN** 它透過 `chromium-authed` 的 storageState 取得 session，不執行 `/login` UI 登入流程

#### Scenario: 混合角色 spec 不被 admin state 污染

- **GIVEN** `admin-subscribers` 同時包含 ADMIN、EDITOR 與匿名測試
- **WHEN** EDITOR 或匿名子群組執行
- **THEN** 該子群組使用 `{ cookies: [], origins: [] }` 或以 `login()` 建立明確身分，不能沿用 admin storageState；ADMIN 子群組才可使用共用 state

#### Scenario: 手動 context 明確處理認證

- **GIVEN** beforeAll／afterAll 以 `browser.newContext()` 建立資料或清理使用者
- **WHEN** 該 context 需要 admin API 權限
- **THEN** 測試明確傳入 storageState 或呼叫 `loginAsAdmin()`，不得假設 project `use.storageState` 會自動套用

#### Scenario: 登入流程與編輯者預覽維持顯式登入

- **WHEN** 測試對象為錯誤密碼、登出、正確登入流程或 `isr-draft-preview` 的編輯者預覽
- **THEN** 該測試以顯式 `login()`／`loginAsAdmin()` 建立身分，不吃共用 admin state 掩蓋認證流程

### Requirement: E2E Project Coverage Is Exact

兩個 Playwright project 的 `testMatch`／`testIgnore` SHALL 互斥且完整覆蓋
`tests/e2e/**/*.spec.ts`。每個收集到的測試 SHALL 恰好出現在一個 project；
未匹配或重複匹配 SHALL 使驗證失敗。當 spec 含多個角色時，角色隔離 SHALL
使用檔案內局部 `test.use` 或顯式登入完成，不得複製整支 spec 到另一 project。

#### Scenario: 測試清單無漏測與重複

- **WHEN** 執行 `npx playwright test --list`
- **THEN** 所有 active 測試各列出一次，且輸出包含正確的 project 名稱；`--shard=1/3` 至 `3/3` 的合計仍涵蓋完整清單
- **AND** 改造後清單為 109 個 active tests、0 skipped；改造前 110 collected 的差額只來自移除一個已有等價 coverage 的永久 skip 空殼

### Requirement: E2E Deterministic Synchronization

E2E 測試 SHALL 以待測行為的確定性條件同步。跳轉、錯誤訊息與 hydration
控制項 SHALL 使用 `toHaveURL`、`toBeVisible`、`toBeEnabled` 等自動等待；
`networkidle` SHALL NOT 被用作 hydration proxy。

固定 `page.waitForTimeout(...)` 不得用來等待跳轉、錯誤訊息或一般 UI 完成。
平滑捲動正向結果 SHALL 以 polling 驗證已移動且連續取樣穩定；「腳本沒有
執行」或「錯誤錨點沒有副作用」等負向斷言 MAY 保留有界觀察視窗，但每處
SHALL 註明觀察目的與上限，不得把固定睡眠當作一般同步工具。

#### Scenario: 跳轉／錯誤以自動等待斷言

- **WHEN** 測試需確認頁面跳轉或錯誤訊息出現
- **THEN** 使用 `expect(page).toHaveURL(...)` 或 `expect(locator).toBeVisible()` 自動重試，不使用固定等待

#### Scenario: hydration 以互動性 gate 等待

- **WHEN** 測試需在 hydration 完成後與受控輸入或按鈕互動
- **THEN** 等待該控制項 `toBeEnabled()`／`toBeVisible()`，而非 `waitForLoadState("networkidle")`

#### Scenario: 平滑捲動以條件式 polling 等待

- **WHEN** 測試需驗證平滑捲動完成
- **THEN** 以移動門檻與連續取樣穩定條件判定，不能用一次 `scrollY` 讀值或固定 1200ms 代表完成

#### Scenario: 否定式斷言允許有界觀察

- **WHEN** 測試需斷言某腳本／錯誤錨點在觀察視窗內沒有副作用
- **THEN** 可保留附註解的有界觀察視窗，且該例外不被誤算為一般 UI 同步


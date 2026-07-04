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


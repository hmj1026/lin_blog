## ADDED Requirements

### Requirement: Validation Schema Unit Tests
The system SHALL have unit tests for all Zod validation schemas in `lib/validations/`.

#### Scenario: Post schema validation
- **WHEN** an invalid post payload is provided to `postSchema.parse()`
- **THEN** a ZodError is thrown with appropriate error messages

#### Scenario: Post API input parsing
- **WHEN** a valid `PostApiInput` with ISO date string is provided to `parsePostApiInput()`
- **THEN** the `publishedAt` field is converted to a `Date` object

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

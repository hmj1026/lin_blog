## Why

專案已有部分單元測試（7 個測試檔），但多項核心模組尚未覆蓋，包括 validation schemas、API utilities、site-settings use-cases 等。補齊測試可提升程式碼品質與 regression 防護，符合 TDD 開發規範。

## What Changes

- **新增** `tests/unit/validations/*.test.ts` — 測試各 Zod validation schema（post/category/tag/role/user/site-setting）
- **新增** `tests/unit/api-utils.test.ts` — 測試 `jsonOk`、`jsonError`、`handleApiError` 等純函式
- **新增** `tests/unit/site-settings.use-cases.test.ts` — 測試 `siteSettingsUseCases`
- **新增** `tests/unit/seo.test.ts` — 測試 `lib/utils/seo.ts` 的 SEO 輔助函式
- **補強** 現有測試覆蓋文件說明

## Impact

- Affected code:
  - `web/src/lib/validations/*.schema.ts`
  - `web/src/lib/api-utils.ts`
  - `web/src/lib/utils/seo.ts`
  - `web/src/modules/site-settings/index.ts`
- No breaking changes
- Improves test coverage from ~30% to ~60%+ on lib/modules logic

## Test Coverage Gap Analysis

### 現有測試

| 測試檔 | 覆蓋範圍 |
|-------|---------|
| `posts.use-cases.test.ts` | Posts use-cases (createPost, getReadablePostBySlug, listRelatedPublishedPosts) |
| `analytics.use-cases.test.ts` | Analytics use-cases (listPostViewEvents, listPostAnalyticsSummary) |
| `rbac/rbac.test.ts` | `lib/rbac.ts` (roleHasPermission, roleHasAnyPermission, listRolePermissions) |
| `middleware/rate-limit.test.ts` | Rate-limiting 邏輯 |
| `sanitize.test.ts` | `lib/utils/sanitize.ts` |
| `content.test.ts` | `lib/utils/content.ts` (resolveUploadUrl, sanitizeAndPrepareHtml) |
| `design-tokens.test.ts` | `lib/design-tokens.ts` |

### 缺少測試

| 模組 | 檔案 | 優先順序 |
|------|------|---------|
| Validation Schemas | `lib/validations/post.schema.ts` | High |
| Validation Schemas | `lib/validations/category.schema.ts` | Medium |
| Validation Schemas | `lib/validations/tag.schema.ts` | Medium |
| Validation Schemas | `lib/validations/role.schema.ts` | Medium |
| Validation Schemas | `lib/validations/user.schema.ts` | Medium |
| Validation Schemas | `lib/validations/admin-user.schema.ts` | Medium |
| Validation Schemas | `lib/validations/site-setting.schema.ts` | Medium |
| API Utilities | `lib/api-utils.ts` (jsonOk, jsonError, handleApiError) | High |
| Site Settings | `modules/site-settings/index.ts` | Medium |
| SEO Utilities | `lib/utils/seo.ts` | Low |

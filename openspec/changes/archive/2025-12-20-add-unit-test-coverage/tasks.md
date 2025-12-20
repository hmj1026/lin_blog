## 1. Validation Schemas Tests

- [x] 1.1 建立 `tests/unit/validations/post.schema.test.ts`
  - 測試 `postSchema` 必填欄位驗證
  - 測試 `postApiSchema` 日期解析
  - 測試 `parsePostApiInput` 轉換邏輯
- [x] 1.2 建立 `tests/unit/validations/category.schema.test.ts`
  - 測試 `categorySchema` 基本驗證
- [x] 1.3 建立 `tests/unit/validations/tag.schema.test.ts`
  - 測試 `tagSchema` 基本驗證
- [x] 1.4 建立 `tests/unit/validations/role.schema.test.ts`
  - 測試 `roleSchema` 基本驗證
- [x] 1.5 建立 `tests/unit/validations/user.schema.test.ts`
  - 測試 `userSchema` 與 `adminUserSchema`

## 2. API Utilities Tests

- [x] 2.1 建立 `tests/unit/api-utils.test.ts`
  - 測試 `jsonOk()` 回傳格式
  - 測試 `jsonError()` 錯誤回傳格式
  - 測試 `handleApiError()` 處理 `ApiException` 與一般 Error

## 3. Site Settings Use Cases Tests

- [x] 3.1 建立 `tests/unit/site-settings.use-cases.test.ts`
  - Mock `prisma` 測試 `getDefault()`
  - Mock `prisma` 測試 `getOrCreateDefault()`
  - Mock `prisma` 測試 `updateDefault()`

## 4. SEO Utilities Tests

- [x] 4.1 建立 `tests/unit/seo.test.ts`
  - 測試 SEO 輔助函式（若存在可測邏輯）

## 5. 驗證

- [x] 5.1 執行 `npm test` 確認所有測試通過
- [x] 5.2 檢查測試覆蓋報告（若有設定 coverage）

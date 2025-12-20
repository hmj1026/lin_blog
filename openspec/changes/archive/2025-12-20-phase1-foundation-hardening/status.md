# Status: Done

- **Driver**: AI Assistant (Antigravity)
- **Start Date**: 2025-12-20
- **Completion Date**: 2025-12-20
- **Type**: Enhancement, Testing, Refactor
- **Impact**: High (Environment Config, Test Coverage, Architecture)

## 進度追蹤

- [x] 確認 `lib/services/` 依賴關係
- [x] 修改 `env.ts` 新增 `APP_ENV`
- [x] 更新 `.env.example`
- [x] 新增 RBAC 測試
- [x] 新增 Middleware Rate Limit 測試
- [x] 替換 `siteSettingService` 為 `siteSettingsUseCases`
- [x] 刪除 `lib/services/` 目錄
- [x] 刪除過時的 service 測試檔案
- [x] 新增 DevToolbar 元件
- [x] 執行完整測試與建置驗證

## 相關變更

### 新增檔案
- `tests/unit/rbac/rbac.test.ts` - RBAC 權限測試（9 test cases）
- `tests/unit/middleware/rate-limit.test.ts` - Rate Limiting 測試（4 test cases）
- `src/components/dev/dev-toolbar.tsx` - 開發環境工具列

### 修改檔案
- `src/env.ts` - 新增 APP_ENV、NODE_ENV、NEXT_PUBLIC_APP_ENV
- `.env.example` - 新增環境變數說明
- `src/modules/site-settings/index.ts` - 新增 getOrCreateDefault() 方法
- `src/app/(admin)/admin/settings/page.tsx` - 改用 siteSettingsUseCases
- `src/app/api/site-settings/route.ts` - 改用 siteSettingsUseCases

### 刪除檔案
- `src/lib/services/` 目錄（5 個檔案）
- `tests/unit/post.service.test.ts`
- `tests/unit/category.service.test.ts`
- `tests/unit/tag.service.test.ts`

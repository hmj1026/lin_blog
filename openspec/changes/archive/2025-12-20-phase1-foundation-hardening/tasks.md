# Task Checklist

## 1. Environment & Config
- [x] 確認 `lib/services/` 依賴關係
- [x] 修改 `env.ts` 新增 `APP_ENV`
- [x] 更新 `.env.example`

## 2. Testing & Security
- [x] 新增 RBAC 測試
- [x] 新增 Middleware Rate Limit 測試

## 3. Refactoring
- [x] 替換 `siteSettingService` 為 `siteSettingsUseCases`
- [x] 刪除 `lib/services/` 目錄
- [x] 刪除過時的 service 測試檔案

## 4. Dev Tools
- [x] 新增 DevToolbar 元件
- [x] 執行完整測試與建置驗證

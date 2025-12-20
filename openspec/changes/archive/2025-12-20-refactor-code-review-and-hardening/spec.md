# Refactor: Code Review, Hardening, and Technical Debt Repayment

## 1. 概述
本次變更集中於解決 Code Review 發現的高/中優先級問題，並修復專案中累積的 TypeScript 類型錯誤與 Next.js 15 相容性問題。目標是提升系統的安全性、穩定性與可維護性。

## 2. 變更詳情

### 2.1 安全性與驗證 (High Priority)
- **API 輸入驗證**: 為 `/api/posts`, `/api/categories`, `/api/tags` 的 POST/PUT 路由全面引入 Zod Schema 驗證 (`safeParse`)，確保輸入資料的結構與類型正確。
- **JWT 權限即時驗證**: 修正 NextAuth Session Callback，改為每次請求時重新從資料庫查詢用戶角色與權限，解決權限變更需等待 Token 過期的問題。若用戶或角色被刪除，Session 自動失效。
- **Rate Limiting 優化**: 在 Middleware 中加入 `cleanupRateLimitStore` 機制，定期清理過期的 IP 記錄，防止記憶體洩漏。修正 `req.ip` 在 Next.js 15 的棄用問題。

### 2.2 系統穩定性 (Medium Priority)
- **Error Boundaries**:
    - `global-error.tsx`: 處理 Root Layout 層級的致命錯誤。
    - `error.tsx`: 處理頁面層級的渲染錯誤。
- **TypeScript 類型修復**: 修復全專案的 TypeScript 建置錯誤，包括 `PostAuthorRecord` (移除不存在的 image 欄位)、NextAuth 類型定義、Prisma User Create Input 等。
- **Next.js 15 相容性**:
    - 修復 `<Link>` 元件 `href` 屬性的嚴格類型檢查問題。
    - 修復 `login` 頁面使用 `useSearchParams` 缺少 `Suspense` 導致的建置錯誤。

### 2.3 可維護性重構 (Medium Priority)
- **Post Form 重構**: 將原本 518 行的 `AdminPostForm` 巨型元件拆分為模組化結構 (`post-form/` 目錄)，提升可讀性與測試性。
    - `index.ts`: 統一匯出
    - `field.tsx`: 表單欄位
    - `picker.tsx`: 分類/標籤選擇器
    - `preview-modal.tsx`: 預覽 Modal
    - `cover-uploader.tsx`: 封面上傳與裁切
    - `utils.ts`, `types.ts`: 工具與類型
- **架構解耦**:
    - 新增 `site-settings` 模組，封裝站點設定的資料存取。
    - `Navbar` 與 `Footer` 不再直接依賴 Prisma，改用 `siteSettingsUseCases`，遵循 Clean Architecture。

## 3. 驗證結果
- **Build**: `npm run build` 通過，無 TypeScript 錯誤。
- **Test**: `npm run test` 通過 (Unit Tests)。
- **Lint**: ESLint 檢查大致通過 (部分未使用變數警告保留)。

## 4. 下一步建議
- 實現首頁動態數據 (取代硬編碼)。
- 增加 Repository 整合測試。

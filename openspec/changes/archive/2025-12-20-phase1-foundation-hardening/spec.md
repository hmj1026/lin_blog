# Phase 1: 基礎強化 - 環境設定與測試覆蓋

## 1. 概述

基於專案完整體檢報告，本次變更專注於「Phase 1：基礎強化」，目標是為專案上線前打下穩固基礎。主要解決以下問題：

1. **環境設定缺失** - 新增 `APP_ENV` 環境變數以區分開發/正式環境
2. **測試覆蓋不足** - 新增 API Routes、RBAC、Middleware 的測試
3. **架構冗餘** - 移除 `lib/services/` 與 `modules/` 重疊的間接層
4. **開發者體驗** - Dev-only 除錯工具與環境感知功能

## 2. 背景分析

### 2.1 現況問題

| 問題 | 影響 | 嚴重度 |
|------|------|--------|
| 無 `APP_ENV` 環境變數 | 無法區分開發/正式環境行為 | 🔴 高 |
| API Routes 無測試 | 難以保證 API 正確性 | 🔴 高 |
| RBAC 無測試 | 權限邏輯錯誤難以察覺 | 🔴 高 |
| Rate Limiting 無測試 | 安全機制無驗證 | 🟡 中 |
| `lib/services/` 冗餘 | 增加維護成本，違反 DRY | 🟢 低 |

### 2.2 變更範圍

```
web/
├── src/
│   ├── env.ts                    # [MODIFY] 新增 APP_ENV
│   ├── lib/
│   │   └── services/             # [DELETE] 移除冗餘層
│   └── components/
│       └── dev/                  # [NEW] Dev-only 工具
├── tests/
│   └── unit/
│       ├── api/                  # [NEW] API Route 測試
│       ├── middleware/           # [NEW] Middleware 測試
│       └── rbac/                 # [NEW] RBAC 測試
└── .env.example                  # [MODIFY] 新增 APP_ENV
```

## 3. 變更詳情

### 3.1 環境設定 (`APP_ENV`)

#### 3.1.1 修改 `src/env.ts`

```typescript
import { z } from "zod";

const envSchema = z.object({
  // 新增環境識別
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_ENV: z.enum(["local", "staging", "production"]).default("local"),
  
  // 現有變數保持不變
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  FIGMA_TOKEN: z.string().optional(),
  UPLOADTHING_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_UPLOAD_BASE_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_ENV: process.env.APP_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  FIGMA_TOKEN: process.env.FIGMA_TOKEN,
  UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_UPLOAD_BASE_URL: process.env.NEXT_PUBLIC_UPLOAD_BASE_URL,
});

// 環境判斷 helpers
export const isDev = env.APP_ENV !== "production";
export const isProd = env.APP_ENV === "production";
export const isLocal = env.APP_ENV === "local";
export const isTest = env.NODE_ENV === "test";
```

#### 3.1.2 更新 `.env.example`

```bash
# 環境識別
NODE_ENV="development"
APP_ENV="local"  # local | staging | production

# 現有變數...
```

### 3.2 移除冗餘 `lib/services/` 層

現有 `lib/services/*.ts` 只是 `modules/*UseCases` 的 thin wrapper，違反 DRY 原則。

#### 影響分析

| 檔案 | 行數 | 依賴者 | 處理方式 |
|------|------|--------|---------|
| `post.service.ts` | 30 | 無直接使用 | 刪除 |
| `category.service.ts` | ~20 | 無直接使用 | 刪除 |
| `tag.service.ts` | ~20 | 無直接使用 | 刪除 |
| `site-setting.service.ts` | ~20 | 無直接使用 | 刪除 |
| `user.service.ts` | ~25 | 無直接使用 | 刪除 |

> ⚠️ **注意**: 需確認無其他檔案依賴這些 services 後再刪除。

### 3.3 新增測試

#### 3.3.1 API Routes 測試

**檔案**: `tests/unit/api/posts.route.test.ts`

```typescript
// 測試重點:
// - GET /api/posts 回傳發佈文章列表
// - POST /api/posts 無權限回傳 401
// - POST /api/posts 有權限且資料正確回傳 201
// - POST /api/posts 資料驗證失敗回傳錯誤
```

**檔案**: `tests/unit/api/categories.route.test.ts`

```typescript
// 測試重點:
// - CRUD 操作的權限驗證
// - 輸入資料驗證
```

#### 3.3.2 RBAC 測試

**檔案**: `tests/unit/rbac/rbac.test.ts`

```typescript
// 測試重點:
// - roleHasPermission() 權限檢查
// - roleHasAnyPermission() 多權限檢查
// - listRolePermissions() 列出角色權限
// - 已刪除角色回傳 false
```

#### 3.3.3 Middleware 測試

**檔案**: `tests/unit/middleware/rate-limit.test.ts`

```typescript
// 測試重點:
// - 同一 IP 連續請求超過限制回傳 429
// - 不同 IP 互不影響
// - 時間窗口過期後重設計數
```

### 3.4 Dev-Only 元件（可選）

**檔案**: `src/components/dev/dev-toolbar.tsx`

```typescript
"use client";
import { isDev } from "@/env";

export function DevToolbar() {
  if (!isDev) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-yellow-100 p-3 text-xs shadow-lg">
      <div>🛠️ DEV MODE</div>
      <div>APP_ENV: {process.env.APP_ENV}</div>
    </div>
  );
}
```

## 4. 驗證計畫

### 4.1 自動化測試

```bash
# 執行所有單元測試
npm run test

# 執行特定測試檔案
npm run test -- tests/unit/api/posts.route.test.ts
npm run test -- tests/unit/rbac/rbac.test.ts
npm run test -- tests/unit/middleware/rate-limit.test.ts
```

### 4.2 建置驗證

```bash
# 確保無 TypeScript 錯誤
npm run build

# Lint 檢查
npm run lint
```

### 4.3 手動驗證

1. **環境變數驗證**
   - 啟動開發伺服器 `npm run dev`
   - 檢查 DevToolbar 是否顯示（僅 `APP_ENV !== "production"` 時）
   - 設定 `APP_ENV=production` 重啟，確認 DevToolbar 隱藏

2. **移除 services 後驗證**
   - 執行 `npm run build` 確保無編譯錯誤
   - 手動測試後台文章 CRUD 功能正常

## 5. 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|---------|
| 移除 services 破壞現有功能 | 低 | 中 | 先搜尋確認無依賴 |
| 新測試覆蓋不完整 | 中 | 低 | 逐步增加覆蓋 |
| APP_ENV 設定錯誤導致正式環境問題 | 低 | 高 | 預設為 local（安全） |

## 6. 實作順序

1. ✅ 搜尋確認 `lib/services/` 無依賴
2. ✅ 修改 `env.ts` 新增 `APP_ENV`
3. ✅ 更新 `.env.example`
4. ✅ 新增 RBAC 測試
5. ✅ 新增 API Routes 測試
6. ✅ 新增 Middleware 測試
7. ✅ 移除 `lib/services/` 目錄
8. ✅ 新增 DevToolbar 元件（可選）
9. ✅ 執行完整測試與建置驗證

## 7. 未來考量

此 Phase 完成後，可進入 Phase 2：
- 文章排程發佈功能
- 全站搜尋
- 文章列表分頁
- RSS Feed

## Why

根據專案體檢報告，Phase 3 聚焦於進階前台功能與更好的閱讀體驗：
- 目錄導航 (TOC) 提升長文章可讀性
- 社群分享按鈕增加內容傳播
- 閱讀進度條提升用戶體驗
- 文章排程發佈支援內容預排

## What Changes

### 前台功能
- **TOC 目錄導航**：自動解析文章 H2/H3 標題，顯示側邊導航
- **社群分享按鈕**：支援 Facebook、Twitter、LINE、複製連結
- **閱讀進度條**：頁面頂部顯示閱讀進度

### 後台功能
- **文章排程發佈**：設定 publishedAt 未來時間，系統自動發佈
  - 新增 `SCHEDULED` 狀態
  - 排程邏輯透過 Next.js Route Handler 定時檢查

## Impact

- **Affected specs**: posts, frontend
- **Affected code**:
  - `modules/posts/` - 排程邏輯
  - `app/(frontend)/blog/[slug]/` - TOC、進度條、分享按鈕
  - `prisma/schema.prisma` - PostStatus enum 新增 SCHEDULED

### **BREAKING**: PostStatus Enum Change
新增 `SCHEDULED` 狀態到 `PostStatus` enum，需執行 Prisma migration。

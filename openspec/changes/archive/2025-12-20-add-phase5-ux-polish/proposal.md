## Why

Phase 5 聚焦於收尾工作與使用者體驗打磨：
- 完成遺漏的整合工作（ThemeToggle、metadata）
- 新增批次操作提升後台管理效率
- 新增後台搜尋功能

## What Changes

### 整合收尾
- **整合 ThemeToggle 到導覽列**：讓使用者可切換深淺色模式
- **整合 ThemeProvider 到 layout**：讓深色模式生效
- **更新文章 metadata**：使用 SEO 自訂欄位

### 後台功能
- **批次操作**：文章列表支援多選發佈/刪除
- **後台搜尋**：快速搜尋文章標題

## Impact

- **Affected specs**: posts, frontend
- **Affected code**:
  - `app/layout.tsx` - 整合 ThemeProvider
  - `components/navbar-client.tsx` - 新增 ThemeToggle
  - `app/(frontend)/blog/[slug]/page.tsx` - metadata 使用 SEO 欄位
  - `app/(admin)/admin/posts/page.tsx` - 批次操作、搜尋

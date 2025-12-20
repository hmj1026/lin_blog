## Why

根據專案體檢報告，Phase 4 聚焦於後台管理體驗與前台展示效果的強化：
- SEO 自訂設定提升搜尋引擎可見度
- 批次操作提升管理效率
- 程式碼高亮提升技術文章可讀性
- 深色模式提升閱讀體驗

## What Changes

### 後台功能
- **SEO 自訂設定**：每篇文章可自訂 meta title、description、OG image
- **批次操作**：文章列表支援多選，批次發佈/草稿/刪除

### 前台功能
- **程式碼高亮**：使用 Prism.js 或 highlight.js 渲染程式碼區塊
- **深色模式**：支援系統偏好與手動切換

## Impact

- **Affected specs**: posts, frontend
- **Affected code**:
  - `prisma/schema.prisma` - 新增 SEO 欄位
  - `components/admin/post-form/` - SEO 設定 UI
  - `app/(admin)/admin/posts/` - 批次操作 UI
  - `components/code-block.tsx` - 程式碼高亮
  - `app/layout.tsx` - 深色模式 toggle

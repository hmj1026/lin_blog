## Why

文章版本歷史是防止誤刪和支援內容回滾的重要安全網：
- 儲存每次編輯的歷史版本
- 支援比較不同版本
- 支援還原到舊版本

## What Changes

### 資料庫
- **PostVersion 模型**：儲存文章歷史版本

### 後台功能
- **版本列表**：查看文章的所有歷史版本
- **版本比較**：比較兩個版本的差異
- **版本還原**：還原到指定版本

## Impact

- **Affected specs**: posts
- **Affected code**:
  - `prisma/schema.prisma` - 新增 PostVersion 模型
  - `modules/posts/` - 版本管理邏輯
  - `app/(admin)/admin/posts/[id]/versions/` - 版本管理 UI
  - `app/api/posts/[id]/versions/` - 版本 API

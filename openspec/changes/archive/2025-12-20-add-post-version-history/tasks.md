## 1. 資料庫

- [x] 1.1 新增 PostVersion 模型到 Prisma schema
- [x] 1.2 執行 db push

## 2. 版本管理邏輯

- [x] 2.1 自動在文章更新時建立版本
- [x] 2.2 版本列表查詢
- [x] 2.3 版本還原功能

## 3. API

- [x] 3.1 GET /api/posts/[id]/versions
- [x] 3.2 GET /api/posts/[id]/versions/[versionId]
- [x] 3.3 POST /api/posts/[id]/versions/[versionId] (restore)

## 4. 驗證

- [x] 4.1 執行 npm run test ✅ 27 passed
- [x] 4.2 執行 npm run build ✅ Exit code: 0

## 1. Database
- [x] 1.1 在 `PostViewEvent` 新增索引 `@@index([deletedAt, viewedAt])`

## 2. Posts Read Model
- [x] 2.1 新增 `PostListItemRecord`（不含 `content`）並更新 ports
- [x] 2.2 `listPublished/listPublishedPaginated/search/listForAdmin/listRelated` 改用 `select`，避免載入 `content`
- [x] 2.3 確保文章詳情（by slug/id）仍會讀取 `content`

## 3. Verification
- [x] 3.1 本機跑 `web` 的 typecheck/test（若現有流程支援）

## 4. Future Upgrade Path (No Implementation)
- [x] 4.1 在 proposal 或 spec delta 補充：高流量時新增 `PostViewDaily` 彙總表（反正規化）作為升級方案

## 1. Image Cropper (Cover)
- [x] 1.1 導入裁切 UI 套件並建立可重用 `ImageCropperModal`。
- [x] 1.2 封面上傳流程改為：選檔 → 裁切/縮放 → 上傳裁切後 blob → 回填 `coverImage=/api/files/<id>`。
- [x] 1.3（可選）內文圖片插入也可走同一裁切 UI（先不做可降低 scope）。

## 2. Sidebar Active Fix
- [x] 2.1 修正 `/admin` active 判斷規則，避免永遠高亮。

## 3. Analytics Data Model
- [x] 3.1 新增 `PostViewEvent`（或等價）模型，包含 postId/slug、viewedAt、ip、ua、referer、device、deletedAt。
- [x] 3.2 Index 與去重策略（例如 window key）。

## 4. Analytics Collection
- [x] 4.1 新增 `POST /api/analytics/views`（前台 client component 呼叫）。
- [x] 4.2 解析裝置資訊（mobile/desktop）與基本 bot 過濾。
- [x] 4.3 支援去重（同 ip+ua+post 在 X 分鐘內只記一次）。

## 5. Admin Reporting
- [x] 5.1 Dashboard 新增統計卡與熱門文章。
- [x] 5.2 新增 `/admin/analytics/posts` 頁：期間、排序（views/unique）、熱門列表。
- [x] 5.3 Sidebar 增加「文章統計」入口（依 permission 顯示）。

## 6. Verification
- [x] 6.1 單元測試：去重/權限/基本解析。
- [x] 6.2 手動驗證：上傳裁切、前台瀏覽累積、儀表板與分析頁呈現。

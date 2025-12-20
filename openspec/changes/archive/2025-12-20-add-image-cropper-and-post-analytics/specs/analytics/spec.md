## ADDED Requirements

### Requirement: Cover Image Cropping Before Upload
系統 SHALL 在後台封面上傳前提供裁切與縮放工具，並上傳裁切後的圖片以符合前台版面比例，同時保留使用者微調能力。

#### Scenario: Crop cover to recommended aspect ratio
- **WHEN** 使用者選擇封面圖片
- **THEN** 系統提供裁切 UI（固定比例/自由裁切、縮放）
- **AND** 上傳後封面在前台不跑版

### Requirement: Post View Analytics Collection
系統 SHALL 收集文章瀏覽事件並儲存必要的時間與裝置/來源資訊，以供儀表板與分析頁使用。

#### Scenario: Frontend records a post view
- **WHEN** 訪客瀏覽文章頁
- **THEN** 系統記錄一次 view event（依去重策略）

### Requirement: Post Analytics Reporting
系統 SHALL 在後台提供文章熱度分析頁，並在儀表板顯示統計摘要。

#### Scenario: Admin views top posts
- **GIVEN** 已有 view events
- **WHEN** 管理者開啟分析頁
- **THEN** 可看到熱門文章排行與期間統計

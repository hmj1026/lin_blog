# analytics Specification

## Purpose
TBD - created by archiving change analytics-integration. Update Purpose after archive.
## Requirements
### Requirement: Support Google Analytics 4
The system MUST include Google Analytics 4 script when a Measurement ID is provided via environment variables.

#### Scenario: GA ID provided
- **GIVEN** `NEXT_PUBLIC_GA_ID` is set to "G-12345"
- **WHEN** the application loads
- **THEN** the GA4 script with ID "G-12345" should be initialized

#### Scenario: GA ID missing
- **GIVEN** `NEXT_PUBLIC_GA_ID` is not set
- **WHEN** the application loads
- **THEN** the GA4 script should NOT be present

### Requirement: Support Google Tag Manager
The system MUST include Google Tag Manager script when a Container ID is provided via environment variables.

#### Scenario: GTM ID provided
- **GIVEN** `NEXT_PUBLIC_GTM_ID` is set to "GTM-ABCDE"
- **WHEN** the application loads
- **THEN** the GTM script with ID "GTM-ABCDE" should be initialized

### Requirement: Support Facebook Pixel
The system MUST include Facebook Pixel script when a Pixel ID is provided via environment variables.

#### Scenario: FB Pixel ID provided
- **GIVEN** `NEXT_PUBLIC_FB_PIXEL_ID` is set to "123456789"
- **WHEN** the application loads
- **THEN** the Facebook Pixel script with ID "123456789" should be initialized

### Requirement: View Trend Chart
The system SHALL display a line chart of page views over time.

#### Scenario: 7-day trend
- **WHEN** an admin views the dashboard
- **THEN** a 7-day view trend line chart SHALL be displayed

#### Scenario: 30-day trend
- **WHEN** an admin selects 30-day range
- **THEN** the chart SHALL update to show 30-day data

---

### Requirement: Top Posts Ranking
The system SHALL display a ranked list of popular posts.

#### Scenario: View top posts
- **WHEN** an admin views the dashboard
- **THEN** top 10 posts by view count SHALL be displayed

---

### Requirement: Device Distribution
The system SHALL display device type distribution.

#### Scenario: View device stats
- **WHEN** an admin views the dashboard
- **THEN** a pie chart of device types SHALL be displayed

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


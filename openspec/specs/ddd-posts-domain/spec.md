# ddd-posts-domain Specification

## Purpose
TBD - created by archiving change refactor-ddd-posts-domain. Update Purpose after archive.
## Requirements
### Requirement: DDD Layering For Posts Domain
系統 SHALL 將 Posts 領域導入 DDD 分層（Domain / Application / Infrastructure / Presentation），並維持依賴方向一致。

#### Scenario: Presentation does not query database directly
- **GIVEN** Next.js route handler 或 server component 需要取得文章資料
- **WHEN** 實作讀取邏輯
- **THEN** 該層不得直接 import Prisma client/寫 query，而是呼叫 Posts application use case

### Requirement: Repository Centralizes Prisma Queries
系統 SHALL 將 Posts 領域的 Prisma query 集中到 Repository（Infrastructure）層，Application 只依賴 repository interface。

#### Scenario: Post list uses repository interface
- **GIVEN** 文章列表 use case
- **WHEN** 取得文章清單
- **THEN** use case 只呼叫 `PostRepository.list(...)`，並可用 fake repository 單元測試

### Requirement: Unit Tests For Use Cases
系統 SHALL 為 Posts 領域的每個 use case 提供單元測試，以驗證商業規則（軟刪、狀態、sanitize、權限）。

#### Scenario: Create post sanitizes HTML content
- **GIVEN** 建立文章請求包含不安全的 HTML
- **WHEN** 執行 create post use case
- **THEN** 寫入資料的 content 會被 sanitize 後再儲存


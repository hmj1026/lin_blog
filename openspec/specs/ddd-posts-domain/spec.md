# ddd-posts-domain Specification

## Purpose
定義文章（posts）領域依循 DDD 分層架構重構的需求，包括以 Repository 集中管理 Prisma 查詢、Use Case 的單元測試覆蓋，以及前台資料映射器（mapper）的完整性。
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

### Requirement: Frontend Mapper Completeness
`toFrontendPost` (`web/src/lib/frontend/post.ts`) SHALL be the sole mapper from a domain/Prisma post shape to `FrontendPost`, and SHALL map all fields the UI needs to render a post, including content and SEO metadata. UI code SHALL consume only `FrontendPost` and SHALL NOT read domain/Prisma post fields directly.

#### Scenario: Blog detail page reads content via FrontendPost
- **GIVEN** `web/src/app/(frontend)/blog/[slug]/page.tsx` renders a post's body content
- **WHEN** it accesses the post's content
- **THEN** it SHALL read the field from the `FrontendPost` object returned by `toFrontendPost`, not from the raw domain/Prisma post

#### Scenario: Blog detail page reads SEO metadata via FrontendPost
- **GIVEN** `web/src/app/(frontend)/blog/[slug]/page.tsx` builds page metadata (title, description, OG image)
- **WHEN** it accesses SEO-related fields
- **THEN** it SHALL read them from the `FrontendPost` object returned by `toFrontendPost`, not from the raw domain/Prisma post


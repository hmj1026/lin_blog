## 1. Proposal Confirmation
- [x] 1.1 確認第一個領域範圍：Posts 是否包含 Category/Tag（預設包含），Uploads/Analytics 是否延後。
- [x] 1.2 確認是否需要導入 DI 套件（預設不導入，先用 factory 注入）。

## 2. DDD Skeleton
- [x] 2.1 建立 `web/src/modules/` 目錄與分層約定（domain/application/infrastructure/presentation）。
- [x] 2.2 新增共用錯誤/Result 型別（例如 `DomainError`, `Result`）與最小規範。
- [x] 2.3 新增最小 lint/約定檢查（可選）：避免在非 infrastructure 引入 `@/lib/db` 或 Prisma client。

## 3. Posts Domain (Phase 1)
- [x] 3.1 定義 Posts domain model（Entity/Value Object）與核心規則（slug 唯一、軟刪、狀態、發佈時間等）。
- [x] 3.2 定義 Repository interface（例如 `PostRepository`, `CategoryRepository`, `TagRepository`）。
- [x] 3.3 實作 Prisma repositories（集中所有 Prisma query / mapping）。
- [x] 3.4 建立 Application use cases（list/detail/create/update/delete/publish 等），並在 use case 內集中商業規則（sanitize、RBAC gate、soft delete）。

## 4. Presentation Migration (Phase 1)
- [x] 4.1 更新 Posts 相關 API route（admin CRUD + frontend 讀取）改呼叫 use cases，不直接使用 Prisma。
- [x] 4.2 更新 admin pages/server components：由 use cases 取得資料（或透過 thin presenter/queries）。
- [x] 4.3 保留既有 `web/src/lib/services/*`（非 Posts 領域）不動，避免一次性大改造成風險。

## 5. Testing
- [x] 5.1 為每個 Posts use case 建立單元測試（使用 fake repository / mock）。
- [x] 5.2 （可選）為 Prisma repositories 建立最小整合測試（需可用 DB）。
- [x] 5.3 保持既有測試可通過，新增測試不引入網路依賴。

## 6. Verification
- [x] 6.1 `npm test` 全數通過。
- [x] 6.2 `npm run db:push` + `npm run db:seed` 可正常運作（schema 無破壞性變更）。
- [x] 6.3 Admin 文章 CRUD、前台文章渲染、權限控管行為不回歸。

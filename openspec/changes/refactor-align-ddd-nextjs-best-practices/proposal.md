# Proposal: refactor-align-ddd-nextjs-best-practices

## Why
目前 `web/src/modules/*` 已有 DDD 分層，但在 `src/app/**`（route handlers / server components）與 `src/lib/**` 仍存在大量直接存取 Prisma 的情況，導致依賴方向不一致、測試困難、以及跨模組的邏輯散落。此提案目標是讓整體架構與 `openspec/specs/architecture/spec.md`、`openspec/specs/ddd-posts-domain/spec.md` 的分層要求一致，並符合 Next.js App Router 的「薄 adapter、厚 use case」最佳實務。

## What Changes
- 將 `src/app/**` 與 `(admin)` server components / route handlers 中的 Prisma 存取改為呼叫對應 module use cases
- 擴充/補齊缺少的 use cases 與 repositories（例如 Posts 版本歷史、批次操作、匯入匯出、排程發布、Analytics 寫入/統計、RBAC/Users/Roles）
- 把 `src/lib/**` 中屬於商業規則的 DB 存取移入 modules（`src/lib` 僅保留 thin utilities / adapters）
- 加上靜態約束（lint 規則）防止 Presentation 直接 import `@/lib/db` 或 `@prisma/client`（允許的例外：各 module 的 `infrastructure/**` 與 `lib/db.ts`）

## Impact
- Affected specs: `architecture`, `ddd-posts-domain`（主要是明確化「Presentation 範圍」與「adapter 規則」）
- Affected code (high level):
  - `web/src/app/api/**`、`web/src/app/(admin)/**`：移除 direct Prisma access
  - `web/src/modules/posts/**`：新增 versions/import/export/batch/schedule 對應 use cases + repositories
  - `web/src/modules/analytics/**`：改用 analyticsUseCases（含 views 寫入與 stats 讀取）
  - `web/src/modules/site-settings/**`：提供 nav/settings read model 的 use case
  - `web/src/lib/api-utils.ts`、`web/src/lib/rbac.ts`：抽離 DB 查詢至 module（保留 adapter 介面）


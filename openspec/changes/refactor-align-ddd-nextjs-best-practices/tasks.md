## 1. Architecture Alignment (DDD)
- [x] 1.1 盤點 `web/src/app/**` 直接 import `@/lib/db` 的點並分類（Posts/Analytics/Security/Admin CRUD）
- [x] 1.2 在 `web/src/modules/posts` 新增 PostVersion repository + use cases（list versions, get version, restore, auto-save on update）
- [x] 1.3 將 `web/src/app/api/posts/[id]/route.ts` 的版本寫入移入 Posts use case（route handler 僅做 input/permission）
- [x] 1.4 將 `web/src/app/api/posts/[id]/versions/**`、`web/src/app/api/posts/batch/route.ts`、`web/src/app/api/posts/import/route.ts`、`web/src/app/api/posts/export/route.ts`、`web/src/app/api/cron/publish-scheduled/route.ts` 遷移到 Posts use cases
- [x] 1.5 在 `web/src/modules/analytics` 新增 views 寫入與 stats 聚合 use cases，並改寫 `web/src/app/api/analytics/*` 只呼叫 use cases
- [x] 1.6 將 `web/src/app/api/nav/route.ts` 讀取 site setting 的 Prisma query 改為 site-settings use case
- [x] 1.7 建立 `security-admin`（或 `users`）module：封裝 Role/Permission/User 的 CRUD 與 RBAC 查詢（取代 `lib/api-utils.ts` / `lib/rbac.ts` 的 direct Prisma）
- [x] 1.8 改寫 `(admin)` server components（dashboard/users/roles 等）改為 use cases（不直接 query Prisma）
- [x] 1.9 建立 `media` module：封裝 uploads/files 的 DB access（取代 `web/src/app/api/uploads/**`、`web/src/app/api/files/**` 的 direct Prisma）

## 2. Next.js Best Practices
- [x] 2.1 Route handlers：統一做 input validation + auth + 呼叫 use case + 回傳 `NextResponse`（避免在 handler 寫商業邏輯）
- [x] 2.2 明確標示需要動態資料的頁面/route（必要時使用 `revalidate`/`dynamic`，避免意外快取）
- [x] 2.3 對跨 server/client 的資料邊界建立固定 DTO（避免把 Prisma shape 直接 leak 到 UI）

## 3. Guardrails
- [x] 3.1 加入 ESLint `no-restricted-imports`：禁止 `src/app/**` 與 `src/components/**` 直接 import `@/lib/db` / `@prisma/client`
- [x] 3.2 針對新增/調整 use cases 補齊 vitest unit tests（依 `openspec/specs/testing/spec.md`）

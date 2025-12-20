# Design Notes: refactor-align-ddd-nextjs-best-practices

## Goals
- 保持現有功能不變（純 refactor / re-wire）
- 讓 Next.js entrypoints（`app/**`）成為 adapter：validation + auth + 呼叫 use case
- 讓 DB access 收斂到 `modules/*/infrastructure/**`（或明確定義的 adapter layer）

## Proposed Module Map
- `modules/posts`: posts/categories/tags + versions + import/export + batch ops + schedule publish
- `modules/analytics`: record view event + dashboard stats + event list/filter
- `modules/site-settings`: default settings + nav read model
- `modules/security-admin` (or `modules/users`): users/roles/permissions + `requirePermission` / `roleHasPermission`

## Boundary Rules (Practical)
- Allowed to import Prisma:
  - `web/src/lib/db.ts`
  - `web/src/modules/**/infrastructure/**`
- Disallowed to import Prisma:
  - `web/src/app/**`
  - `web/src/components/**`
  - `web/src/modules/**/domain/**`
  - `web/src/modules/**/application/**`

## Migration Pattern
1. 在 module 內新增 repo interface（application/ports.ts）與 Prisma repo（infrastructure/prisma/*.ts）
2. 在 module use cases 補齊對應方法（application/use-cases.ts）
3. 將 route handler / server component 改成呼叫 use case（保留原本 response 形狀）
4. 補 unit tests（以 fake repo 驗證商業規則）


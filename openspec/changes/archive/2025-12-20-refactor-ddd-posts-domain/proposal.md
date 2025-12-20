## Why
目前 `web` 專案中，Prisma query 分散在 `services`、API route、page/server component 內，導致商業邏輯與資料存取耦合、可測性偏低、後續擴充（權限/軟刪/分析/上傳）容易重複實作與漏規則。需要導入 DDD 分層與 Repository Pattern，先在一個領域落地後再逐步拓展到全專案。

## What Changes
- 導入 DDD 分層（Domain / Application / Infrastructure / Presentation），並建立清楚的依賴方向與目錄結構。
- 所有 SQL/Prisma query 逐步集中至 Repository（Infrastructure 層），Application 層用 Use Case 統一商業邏輯。
- **先完成第一個領域：Posts**（包含 post / category / tag 的核心操作與規則），其餘領域維持既有方式，待下一階段逐步遷移。
- 補齊單元測試：Use Case 以 in-memory / mock repository 驗證行為；Repository 以最小整合測試（可選）驗證 Prisma mapping。

## Assumptions / Open Questions
- 第一個落地的領域以「文章（Posts）」為主，是否需要同時納入「上傳（Uploads）」或「分析（Analytics）」為同一 bounded context？
- 是否希望在 DDD 落地時一併加入 DI 容器（例如 tsyringe/inversify），或先採用「純函式 + factory」降低引入成本（預設採用後者）。

## Impact
- Affected code: `web/src/lib/services/*`, `web/src/app/api/**`, `web/src/app/(admin)/**`, `web/src/components/**`（逐步遷移，先以 Posts 領域為主）。
- Affected specs: 新增 `ddd-posts-domain`（本變更提案內定義）。

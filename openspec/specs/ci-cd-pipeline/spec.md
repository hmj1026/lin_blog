# ci-cd-pipeline Specification

## Purpose
定義持續整合與持續部署流程的需求，包括 CI 品質關卡、可重現的容器映像建置、受保護分支需通過 CI 檢查方可合併，以及自動化的部署工作流程。
## Requirements
### Requirement: Continuous Integration Quality Gate
系統 SHALL 提供一個 CI workflow，在每個 Pull Request 與對主要分支的 push 上，於 Node.js 版本矩陣（20 與 22，兩個受支援的 LTS 版本）執行完整品質檢查：ESLint、TypeScript 類型檢查、Vitest 單元測試、Next.js production build。任一步驟失敗時整個 workflow SHALL 判定為失敗。

> 註：原規格指定 Node 18 與 20；實作階段驗證發現測試工具鏈 Vitest 4（依賴 ESM-only 的 Vite 6/7）無法在 Node 18 執行（`ERR_REQUIRE_ESM`），且 Node 18 已於 2025-04 EOL。故將矩陣改為兩個仍受支援的 LTS 版本 20 與 22，維持「多版本驗證」之原始意圖。

#### Scenario: Pull request triggers full quality gate
- **GIVEN** 一個對 `develop` 或 `main` 的 Pull Request
- **WHEN** CI workflow 被觸發
- **THEN** 系統在 Node 20 與 22 兩個版本上依序執行 lint、typecheck、unit test 與 build

#### Scenario: Failing check blocks the workflow
- **GIVEN** 某次提交導致 ESLint、typecheck、unit test 或 build 其中之一失敗
- **WHEN** CI workflow 執行
- **THEN** workflow 整體結果為失敗，且該 PR 的檢查狀態顯示為未通過

#### Scenario: Prisma client generated before type-dependent steps
- **GIVEN** 專案的 typecheck / test / build 依賴 Prisma 生成的型別
- **WHEN** CI workflow 執行
- **THEN** 系統在 typecheck、test、build 之前先執行 `prisma generate`

### Requirement: Reproducible Container Image
系統 SHALL 提供一個 multi-stage `Dockerfile` 與 `docker-compose.yml`（app + postgres），使專案可在本機以容器方式建置並執行，且 `.dockerignore` 排除非必要檔案。

#### Scenario: Local docker build succeeds
- **WHEN** 開發者在專案根目錄執行 `docker compose up -d --build`
- **THEN** app 與 postgres 服務成功建置並啟動，app 可透過設定的埠對外服務

### Requirement: Protected Branch Merge Requires Passing CI
系統 SHALL 對 `main` 分支啟用 branch protection，要求 CI 檢查通過且經過 Code Review 後方可合併。

#### Scenario: Merge blocked until CI passes
- **GIVEN** 一個目標為 `main` 的 Pull Request 且其 CI 檢查尚未通過
- **WHEN** 使用者嘗試合併該 PR
- **THEN** 系統阻擋合併，直到 CI 通過且取得必要的 Code Review 核准

### Requirement: Continuous Deployment Workflow
若專案選擇啟用自動化部署（本能力對應 tasks §4，屬選配範疇），系統 SHALL 提供一個 CD workflow，於 push 到 `develop` 時自動部署至 Staging，並提供手動觸發的 Production 部署；若專案改採平台原生部署（如 Vercel），則可於實作階段決議不啟用此 workflow。

> 註（2026-07-05）：`cd.yml` 已實作但決議暫緩啟用 — 實際登入正式機確認 Staging 主機
> 未建置、GitHub Environments 未設定必要 secrets，首次自動觸發已因缺少
> `DEPLOY_HOST` 失敗（`gh run 28722905740`）。已移除自動觸發、以 `if: false` 擋下
> 兩個部署 job，並執行 `gh workflow disable cd.yml`，正式環境持續採用人工執行
> `/root/deploy.sh`。細節見 `docs/private/staging-deploy-guide.md`（本機限定，
> 已列入 `.gitignore`，未納入版控）。

#### Scenario: Push to develop deploys to staging
- **GIVEN** 一個成功通過 CI 的 commit 被 push 到 `develop`
- **WHEN** CD workflow 被觸發
- **THEN** 系統自動將該版本部署至 Staging 環境

#### Scenario: Production deploy is manually triggered
- **WHEN** 維運者手動觸發 Production 部署
- **THEN** 系統以指定版本部署至 Production 環境


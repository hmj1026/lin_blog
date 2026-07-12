## Stage 1: Release Baseline and Migration Inventory
- **Goal**: 確認目前 production schema 與 Prisma schema 的差異，建立可部署的 reconciliation migration。
- **Criteria**: disposable DB 從 migration history 建立後，`prisma migrate deploy` 完整通過；SiteSetting/Post/relations 欄位與 schema 一致；不使用 `db push`。
- **Tests**: `prisma migrate deploy`, schema contract query, integration suite。
- **Status**: Done

## Stage 2: Immutable Release and Deployment Safety
- **Goal**: 讓 release 具備 version/CHANGELOG、immutable image tag 與 DB readiness/health check。
- **Criteria**: deploy script 不以 mutable `latest` 作為唯一輸入，不以固定 sleep 作為 readiness；version 與 tag 流程可重現。
- **Tests**: shell syntax/static checks, deployment dry-run, Docker compose config validation。
- **Status**: Done

## Stage 3: CI, E2E and OpenSpec Gates
- **Goal**: 將 production-required validation 接入可觸發的 CI gate，完成相關 OpenSpec 未完成任務。
- **Criteria**: develop/main PR gate 包含 unit、integration、build 與 E2E；concurrency 驗證與 OpenSpec archive 前置項完成或明確拆出；不以 skip/retry 隱藏失敗。
- **Tests**: workflow runtime/build-env contract、workflow syntax/static checks、OpenSpec strict validation、local full validation stack、GitHub PR #28 live E2E。
- **Status**: In Progress

### Stage 3.1: Repair E2E Runtime Contract Drift
- **Goal**: 修正 E2E job 缺少 `CRON_SECRET` 而在 Playwright 執行前中止的問題，並加入跨 CI/E2E/Docker build surface 的防復發檢查。
- **Criteria**: `CRON_SECRET` 維持 required/fail-fast；E2E 使用非 production placeholder；CI、E2E、Docker builder 均具備 `DATABASE_URL`、`NEXTAUTH_SECRET`、`CRON_SECRET`；Playwright step 實際執行。
- **Tests**: 先讓 runtime contract regression test 對現況失敗，再完成 Green；執行 targeted unit test、`npm run check`、workflow contract check，最後重跑 PR #28 E2E 並確認 11/11 checks。
- **Status**: In Progress
- **Local verification**: runtime contract `7/7`、targeted regression `16/16`、完整 unit `1133/1133`、coverage lines `88.9%`、lint/typecheck、shell syntax、workflow YAML parse、`git diff --check` 均通過。
- **Pending verification**: sandbox 無法連線本機 PostgreSQL，權限申請又受執行環境用量限制拒絕；仍須將修正推至 PR #28，確認完整 E2E 實際執行與 11/11 checks。

## Stage 4: Release Candidate Verification
- **Goal**: 在重整後歷史與 production remediation 上完成最終 release review。
- **Criteria**: check、unit/coverage、integration、build、E2E、migration rehearsal、OpenSpec 全綠；版本／CHANGELOG 完成；工作樹乾淨；不 push。
- **Tests**: 完整本機驗證與 release checklist。
- **Status**: In Progress

## Release blockers requiring external state
- [ ] GitHub live run：PR #28 HEAD `b97e95c` 已觸發 CI/E2E；CI 10 項通過，E2E 因 job-level env 缺少 required `CRON_SECRET` 而在 Next.js build 中止，尚未執行 Playwright。修正後須重新驗證完整 E2E 與 11/11 checks；branch protection API 仍受 GitHub plan 403 限制。
- [ ] OpenSpec `optimize-ci-cost-and-actions-runtime`：tasks 9.2 archive 與 10.2 live concurrency 仍需 PR 合併後由有權限的人員執行；strict validation 已通過。
- [ ] Production deployment：CD workflow 目前刻意停用，正式主機、registry 與 secrets 未在本地 scope；需部署責任人以 immutable tag 執行 deploy runbook。
- [ ] Release publication：版本 tag、GitHub Release 與 remote push 尚未授權，本次只保留本地 commits。

## Stage 1: Release Baseline and Migration Inventory
- **Goal**: 確認目前 production schema 與 Prisma schema 的差異，建立可部署的 reconciliation migration。
- **Criteria**: disposable DB 從 migration history 建立後，`prisma migrate deploy` 完整通過；SiteSetting/Post/relations 欄位與 schema 一致；不使用 `db push`。
- **Tests**: `prisma migrate deploy`, schema contract query, integration suite。
- **Status**: Done

## Stage 2: Immutable Release and Deployment Safety
- **Goal**: 讓 release 具備 version/CHANGELOG、immutable image tag 與 DB readiness/health check。
- **Criteria**: deploy script 不以 mutable `latest` 作為唯一輸入，不以固定 sleep 作為 readiness；version 與 tag 流程可重現。
- **Tests**: shell syntax/static checks, deployment dry-run, Docker compose config validation。
- **Status**: In Progress

## Stage 3: CI, E2E and OpenSpec Gates
- **Goal**: 將 production-required validation 接入可觸發的 CI gate，完成相關 OpenSpec 未完成任務。
- **Criteria**: develop/main PR gate 包含 unit、integration、build 與 E2E；concurrency 驗證與 OpenSpec archive 前置項完成或明確拆出；不以 skip/retry 隱藏失敗。
- **Tests**: workflow syntax/static checks, OpenSpec strict validation, local full validation stack。
- **Status**: In Progress

## Stage 4: Release Candidate Verification
- **Goal**: 在重整後歷史與 production remediation 上完成最終 release review。
- **Criteria**: check、unit/coverage、integration、build、E2E、migration rehearsal、OpenSpec 全綠；版本／CHANGELOG 完成；工作樹乾淨；不 push。
- **Tests**: 完整本機驗證與 release checklist。
- **Status**: In Progress

## Release blockers requiring external state
- [ ] GitHub live run：`gh` token 已恢復有效，但 branch protection API 回傳 GitHub plan 403，且本地 HEAD 尚未 push，因此尚未能驗證本 branch 的 CI/E2E run、concurrency cancellation 與 protection context。
- [ ] OpenSpec `optimize-ci-cost-and-actions-runtime`：tasks 9.2 archive 與 10.2 live concurrency 仍需 PR 合併後由有權限的人員執行；strict validation 已通過。
- [ ] Production deployment：CD workflow 目前刻意停用，正式主機、registry 與 secrets 未在本地 scope；需部署責任人以 immutable tag 執行 deploy runbook。
- [ ] Release publication：版本 tag、GitHub Release 與 remote push 尚未授權，本次只保留本地 commits。
- [ ] Final localization：最後的 idempotent migration、E2E limiter isolation、文件與 plan 修改仍在 working tree；需取得 `.git/index` 寫入權限後建立最後本地 commit。
- [ ] Exact final migration rehearsal：原始 migration 已在空 test DB 成功，`IF NOT EXISTS` 版本已在既有 schema 成功；最後版本的空 DB rehearsal 尚待重新執行。

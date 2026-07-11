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
- **Status**: Todo

## Stage 4: Release Candidate Verification
- **Goal**: 在重整後歷史與 production remediation 上完成最終 release review。
- **Criteria**: check、unit/coverage、integration、build、E2E、migration rehearsal、OpenSpec 全綠；版本／CHANGELOG 完成；工作樹乾淨；不 push。
- **Tests**: 完整本機驗證與 release checklist。
- **Status**: Todo

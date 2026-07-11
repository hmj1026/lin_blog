# Changelog

All notable changes to this project will be documented in this file.

## 1.4.0 — 2026-07-11 — 讀者探索與訂閱

整合讀者探索、熱門文章、搜尋與電子報訂閱流程，並補齊 production release 所需的
資料庫 migration、E2E gate 與 immutable deployment 驗證。

### 新增功能 (feat)
- **reader**: 新增 discovery feed、搜尋、熱門文章與訂閱者管理流程
- **newsletter**: 新增 reCAPTCHA、限流、重複訂閱與退訂處理
- **post**: 支援原始 HTML、目錄與公開文章安全檢查

### Release 安全性 (chore)
- 補齊 `SiteSetting` schema reconciliation migration 與 DB contract test
- 部署腳本要求版本或 SHA image tag，並以容器 healthcheck 取代固定等待
- 啟用 PR/main 的 Playwright E2E workflow，保留失敗即阻擋的 gate

## 1.3.3 — 2026-07-10 — CI 成本與 GitHub Actions runtime 優化

降低 CI 過度觸發與 post-merge 重複矩陣執行，升級 GitHub Actions runtime 至 node24（清除 Node 20 棄用警告），並將執行基準升至 Node 22。

### 持續整合 (ci)
- 為 `ci.yml` / `docker-build.yml` / `e2e.yml` 加上 `concurrency` 群組，取消同來源過時的 run
- 移除 `ci.yml` 的 `push:[main]` 觸發；合併後對 `main` 的驗證改由 `docker-build.yml` 的 `push` → `workflow_call` 提供，post-merge CI job 由 16 降為 8（加 `detect` 為 9）
- `docker-build.yml` 的 `push` 加上 `paths` 過濾（tag 豁免，release 一定建置）
- 新增 `detect` job，依 PR 目標分支條件化 Node 矩陣（PR→develop 單一 `[22]`；PR→main / push / workflow_call 維持 `[20,22]`）
- 升級 `actions/checkout@v7`、`actions/setup-node@v6`、`actions/upload-artifact@v7`（node24 runtime）
- 為三個 workflow 設定最小權限 `permissions: { contents: read }`，僅 docker build-push job 保留 `packages: write`

### 雜項 (chore)
- runtime 基準升至 Node 22：`web/Dockerfile` `node:22-slim`、新增 `.nvmrc`、`web/package.json` `engines.node ">=22 <25"`
- `e2e.yml` 的 Postgres service image 由 `postgres:15` 對齊 `postgres:16`
- 新增 CI 版本一致性檢查（斷言 `.nvmrc` / Dockerfile / `engines.node` / e2e postgres 宣告彼此相符）

## 1.3.2 — 2026-07-09 — 強化 Rich HTML 偵測與 Sanitizer 修正

本版本主要強化後台 WYSIWYG 編輯器在一般模式下被剝除自訂樣式時的風險警示，並修正 CSS `behavior:` 消毒時誤判 `scroll-behavior` 的問題。

### 新增功能 (feat)
- **view**: 後台文章編輯表單在一般模式偵測到 Rich HTML 時顯示警告橫幅與提供切換原始 HTML 的選項
- **post**: 支援在匯入文章的 Use Case 中識別與保留 `allowRawHtml` 屬性
- **infra**: 新增 `detectStrippedRichHtml` 輔助工具以判斷內容是否含有將被 WYSIWYG sanitizer 剝除的結構或 inline style

### 問題修復 (fix)
- **infra**: 修正 `stripDangerousCss` 中對 `behavior:` 的清理邏輯，確保保留現代瀏覽器支援的 `scroll-behavior` 屬性

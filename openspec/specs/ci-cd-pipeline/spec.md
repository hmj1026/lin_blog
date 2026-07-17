# ci-cd-pipeline Specification

## Purpose
定義持續整合與持續部署流程的需求，包括 CI 品質關卡、可重現的容器映像建置、受保護分支需通過 CI 檢查方可合併，以及自動化的部署工作流程。
## Requirements
### Requirement: Continuous Integration Quality Gate
系統 SHALL 提供一個 CI workflow,在每個對 `main` 或 `develop` 的 Pull Request,以及
其他 workflow(如 `docker-build.yml`)以 `workflow_call` 重用呼叫時,執行完整品質
檢查:ESLint、TypeScript 類型檢查、Vitest 單元測試、Next.js production build。
任一步驟失敗時整個 workflow SHALL 判定為失敗。

Node.js 版本矩陣 SHALL 於所有觸發情境統一為單一版本 **22**(Jod,支援至 2027-04-30),
作為開發/正式環境的 runtime 基準。Node 20(Iron)已於 2026-04-30 EOL 且
`engines.node`(`">=22 <25"`)已排除其使用,SHALL 自矩陣移除;`main` 的 branch
protection required checks SHALL 同步僅綁定 Node 22 命名的檢查(見「Protected Branch
Merge Requires Passing CI」)。矩陣輸出 SHALL 保留由 `detect` job 單點控制,以利未來
新增版本(如 Node 24)時協調式調整。

`docker-build.yml` 的 `push` 觸發 SHALL 套用 `paths` 過濾(`web/**` 與相關 workflow
檔案),使「僅改文件的 `main` 分支 push」不重建映像、不重跑內部 CI 重用。因 GitHub 明文
規定「Path filters are not evaluated for pushes of tags.」,`v*.*.*` release tag push
一定會建置映像、不受 `paths` 影響。`pull_request` 觸發 SHALL NOT 套用 `paths` 過濾,
因為 `main` 的 branch protection 要求對應的必要狀態檢查一定要產生;若在 `pull_request`
加 `paths`,不符合路徑的 PR 將無法產生該檢查、永遠卡在 pending 而無法合併。`ci.yml`
自身無 `push` 觸發(見下段),故無 `ci.yml` push paths。

CI workflow 自身 SHALL NOT 保留獨立的 `push` 觸發;合併後(post-merge)對 `main`
的驗證改由 `docker-build.yml` 的 `push` 觸發內部以 `workflow_call` 呼叫本 workflow
提供。

> 註:原規格指定 Node 18 與 20;實作階段因 Vitest 4 不支援 Node 18(`ERR_REQUIRE_ESM`)
> 且 Node 18 已 EOL 改為 20 與 22。2026-07-10 將 runtime 基準升至 Node 22 但暫留 Node 20
> 於矩陣(受 branch protection context 綁定)。本變更(streamline-ci-workflow-stages)
> 完成該協調式調整:移除 Node 20、同步更新 branch protection required checks。

#### Scenario: Pull request triggers single-version quality gate
- **GIVEN** 一個對 `main` 或 `develop` 的 Pull Request
- **WHEN** CI workflow 被觸發
- **THEN** 系統在 Node 22 上執行 lint、typecheck、unit test 與 build,
  且不因變更路徑而略過任何步驟

#### Scenario: Reusable CI call runs the same single-version matrix
- **GIVEN** `docker-build.yml` 以 `workflow_call` 呼叫 CI workflow
- **WHEN** CI workflow 執行
- **THEN** 矩陣同樣僅含 Node 22,與 PR 路徑一致

#### Scenario: Docker build filters branch pushes by path but never tags
- **GIVEN** 一個僅修改文件(未觸及 `web/**`)的 commit 被 push 到 `main`
- **WHEN** `docker-build.yml` 的 `push` 觸發評估其 `paths` 過濾
- **THEN** 該 push 被略過、不重建映像;但若改為推送 `v*.*.*` tag,則因 tag 不評估 path
  filter,映像建置一定執行

#### Scenario: Documentation-only main push may skip post-merge image CI
- **GIVEN** 一個僅修改文件且未觸及 `web/**` 或 Docker/CI workflow 的 commit 被 push 到 `main`
- **WHEN** `docker-build.yml` 評估 branch push 的 `paths` 過濾
- **THEN** Docker workflow 與其 reusable CI 可被略過;此行為不得被誤報為 E2E
  或一般 CI 失敗

#### Scenario: Failing check blocks the workflow
- **GIVEN** 某次提交導致 ESLint、typecheck、unit test 或 build 其中之一失敗
- **WHEN** CI workflow 執行
- **THEN** workflow 整體結果為失敗,且該 PR 的檢查狀態顯示為未通過

#### Scenario: Prisma client generated before type-dependent steps
- **GIVEN** 專案的 typecheck / test / build 依賴 Prisma 生成的型別
- **WHEN** CI workflow 執行
- **THEN** 系統在 typecheck、test、build 之前先執行 `prisma generate`

#### Scenario: Merge to main is verified via the image build workflow
- **GIVEN** 一個符合 `docker-build.yml` branch `paths` 過濾的 commit 被 merge 到 `main`
- **WHEN** `docker-build.yml` 的 `push` 觸發啟動
- **THEN** 該 workflow 內部以 `workflow_call` 呼叫 CI workflow,並在 CI 通過後才
  執行映像建置與推送;CI workflow 自身不會因為這次 merge 而再被 `push` 觸發一次
  (post-merge 的 CI 矩陣只跑一次)

### Requirement: ESLint react-hooks v6 規則恢復上游嚴格度

`web/eslint.config.mjs` SHALL 移除 upgrade-nextjs-16 期間對 `react-hooks/set-state-in-effect`、`react-hooks/purity`、`react-hooks/error-boundaries`、`react-hooks/immutability` 的 warn 降級 override,恢復 `eslint-config-next@16` 預設 error。既有 14 處命中 SHALL 逐一以不改變可觀察行為的方式修正;`npm run lint` SHALL 無任何 react-hooks 規則之 error 或 warning。

#### Scenario: Lint gate 回復嚴格度且行為不變

- **GIVEN** 14 處命中已依 React 官方建議手法重構且 warn override 已移除
- **WHEN** 執行 `npm run check`、unit、integration 與全套 Playwright E2E
- **THEN** lint 0 errors 且無 react-hooks warnings,所有測試通過,ThemeProvider/hydration gate 等行為與基線一致

### Requirement: Reproducible Container Image
系統 SHALL 提供一個 multi-stage `Dockerfile` 與 `docker-compose.yml`（app + postgres），使專案可在本機以容器方式建置並執行，且 `.dockerignore` 排除非必要檔案。

#### Scenario: Local docker build succeeds
- **WHEN** 開發者在專案根目錄執行 `docker compose up -d --build`
- **THEN** app 與 postgres 服務成功建置並啟動，app 可透過設定的埠對外服務

### Requirement: Protected Branch Merge Requires Passing CI
系統 SHALL 對 `main` 分支啟用實際生效的 GitHub Ruleset、classic Branch Protection
或兩者,要求 CI 檢查通過且經過 Code Review 後方可合併。所有生效設定的 required
status checks SHALL 與 CI 矩陣同步:矩陣僅含 Node 22 時,
required checks 為 4 個(`Lint (Node 22)`、`Type Check (Node 22)`、
`Unit Tests (Node 22)`、`Build (Node 22)`)。變更 CI 矩陣時 SHALL 於下一個目標為
`main` 的 Pull Request 建立之前完成所有 protection 設定的對應更新,避免 PR 等待永不
出現的 required check。每次 workflow 變更後 SHALL 以可讀取的 GitHub API、UI 或設定
export 確認實際 enforcement source 與 contexts;若 API 因 repository plan 不可用,
UI/export 證據 SHALL 由具權限者補齊。

#### Scenario: Merge blocked until CI passes
- **GIVEN** 一個目標為 `main` 的 Pull Request 且其 CI 檢查尚未通過
- **WHEN** 使用者嘗試合併該 PR
- **THEN** 系統阻擋合併,直到 CI 通過且取得必要的 Code Review 核准

#### Scenario: Required checks stay aligned with the CI matrix
- **GIVEN** CI 矩陣自 Node 20+22 收斂為僅 Node 22
- **WHEN** 下一個目標為 `main` 的 Pull Request 建立
- **THEN** ruleset 的 required checks 已更新為 4 個 Node 22 檢查,PR 不會因等待
  `(Node 20)` 命名的檢查而永久 pending

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

### Requirement: CI Run Deduplication and Concurrency Control
系統 SHALL 為 `ci.yml`、`docker-build.yml`、`e2e.yml` 設定 `concurrency` 群組，讓
同一 ref / 同一觸發來源下較舊的執行中 run 在有新 run 產生時被取消（`e2e.yml` 的
`cancel-in-progress` 依手動測試體驗決定，預設不砍進行中的手動 run），以避免重複消耗
Actions 執行分鐘數。

reusable workflow（`workflow_call`）呼叫 CI 的執行，SHALL 與 CI workflow 自身其他
觸發方式（`pull_request`）的執行互不干擾、不會互相取消對方的 run。

系統 SHALL 為 `ci.yml`、`e2e.yml` 及 reusable CI 的呼叫端（`docker-build.yml`）設定
top-level 最小權限 `permissions: { contents: read }`，僅映像 build-push job 保留
`packages: write`。因 reusable workflow 的權限只能被呼叫端**降低**、無法提升，呼叫端
SHALL 自行宣告最小權限。

#### Scenario: Rapid consecutive pushes cancel stale runs
- **GIVEN** 對同一個已開啟的 Pull Request 在短時間內連續 push 兩次
- **WHEN** 第二次 push 觸發新的 CI run
- **THEN** 系統取消第一次仍在執行中的 run，只保留最新一次的結果

#### Scenario: Reusable CI call does not collide with unrelated triggers
- **GIVEN** `docker-build.yml` 的 `push` 觸發以 `workflow_call` 呼叫 CI workflow，
  同時有另一個開發者對 `develop` 開啟 Pull Request 觸發 CI workflow 自身的
  `pull_request` 事件
- **WHEN** 兩者幾乎同時執行
- **THEN** 系統將兩者視為不同的 concurrency 群組，兩個 run 都能正常執行到完成，
  不會有任一方被誤取消

#### Scenario: Workflows run with least-privilege token
- **GIVEN** CI 與 e2e workflow 及 reusable CI 呼叫端
- **WHEN** workflow 執行
- **THEN** 其 `GITHUB_TOKEN` 權限為 `contents: read`，且只有映像 build-push job 具備
  `packages: write`，不多授予其他權限

### Requirement: Consistent Runtime Version Pinning
系統 SHALL 提供 `.nvmrc`(值為 `22`)與 `web/package.json` 的 `engines.node`
(有界區間 `">=22 <25"`)作為 runtime **基準契約**(baseline contract)。由於
`.nvmrc`、`engines.node`、`Dockerfile`、e2e Postgres 等宣告彼此不會自動強制一致,
系統 SHALL 於 CI 提供一個一致性檢查 step,斷言這些版本宣告彼此相符,否則它們只是
各自硬編、易於漂移。CI 矩陣(`[22]`)與基準契約一致,單一版本即為部署版本。

E2E workflow 與 CI integration-test 使用的 Postgres service image 主版本 SHALL 與
`docker-compose.yml`(正式環境使用的版本)保持一致。

#### Scenario: Local and CI use a consistent Node baseline
- **GIVEN** 開發者在本機執行 `nvm use` 或相容工具讀取 `.nvmrc`
- **WHEN** 開發者接著在本機執行測試或建置
- **THEN** 使用的 Node 版本(22)與 CI 矩陣版本一致,且與
  `web/package.json` 的 `engines.node` 宣告相容

#### Scenario: CI asserts runtime baseline declarations agree
- **GIVEN** `web/Dockerfile`、`.nvmrc`、`web/package.json` 的 `engines.node`、
  `e2e.yml` 與 `ci.yml` integration-test 的 postgres 版本宣告
- **WHEN** CI 的一致性檢查 step 執行
- **THEN** 若任一宣告與其他不相符,該 step SHALL 失敗,阻止漂移進入主分支

#### Scenario: E2E Postgres matches the compose/production version
- **GIVEN** `docker-compose.yml` 定義的 postgres image 版本
- **WHEN** `e2e.yml` 或 `ci.yml` integration-test 啟動其 Postgres service 容器
- **THEN** 三者使用相同的 Postgres 主版本,避免測試與正式環境行為出現版本落差

### Requirement: E2E Cross-Machine Sharding

E2E workflow（`e2e.yml`）SHALL 以 `strategy.matrix` 預設分為 3 片，使用
Playwright `--shard=<i>/3` 跨 runner 並行執行。每片 SHALL 維持 `workers: 1`、
`fail-fast: false`，並具備獨立的 Postgres service、migration、seed 與 dev
server。分片數只有在效能量測未達門檻時才 MAY 提高至 4，且不得省略基線與
runner-minutes 比較。

#### Scenario: 測試跨三片並行且每個測試只執行一次

- **GIVEN** 一個對 `main` 或 `develop` 的 Pull Request
- **WHEN** E2E workflow 觸發
- **THEN** matrix 啟動 3 個 runner，每片以正確的 `--shard` 執行，Playwright list 結果顯示每個測試恰好被一個 project／shard 選取，片內維持單一 worker

#### Scenario: 單片失敗不取消其他分片但 workflow 仍失敗

- **WHEN** 某一分片測試失敗
- **THEN** 其餘分片仍執行完成，且 workflow 最終結果反映 e2e matrix 有失敗

### Requirement: E2E Browser Cache and Redundant Build Removal

E2E workflow SHALL 以 lockfile 中實際解析的 Playwright 版本建立 browser binary
cache key。每個 runner SHALL 準備 Chromium 所需的 OS dependencies；cache miss
時才下載 Chromium binary。確認 `npm run build` 不為 E2E 的 migration、seed 或
`next dev` 提供必要產物後，E2E job SHALL NOT 保留該步驟；production build
驗證由 `ci.yml` 的 build job 提供。

#### Scenario: 瀏覽器快取命中時略過 binary 下載

- **GIVEN** 先前 run 已快取相同 Playwright 版本的 Chromium binary
- **WHEN** E2E job 執行 browser install steps
- **THEN** OS dependencies 仍具備，且不重新下載 Chromium binary

#### Scenario: E2E job 不重複建置

- **WHEN** E2E job 執行
- **THEN** 不執行 `npm run build`；E2E 直接對 `next dev` 測試，PR 的 production build 由 `ci.yml` 覆蓋

### Requirement: E2E Sharded Report Merging

E2E workflow SHALL 在 CI 使用 blob + list reporter。每個分片 SHALL 以
`if: always()` 上傳名稱含 shard index 的 blob artifact；trace 與 screenshot
SHALL 僅在分片失敗時上傳。合併 job SHALL `needs` 所有分片並以 `if: always()`
下載所有可得 blob，使用 `playwright merge-reports` 產生單一 HTML artifact。
合併 job 不得把 e2e matrix 的失敗轉為 workflow success。

#### Scenario: 分片報告合併為單一 HTML

- **GIVEN** 所有 E2E 分片皆已完成並上傳各自的 blob 報告
- **WHEN** 合併 job 執行
- **THEN** 下載全部 blob 並產生單一合併 HTML 報告 artifact

#### Scenario: 失敗分片仍可產出報告

- **WHEN** 某一分片測試失敗
- **THEN** 該分片仍上傳 blob 與 trace／screenshot，merge job 仍執行並可產出部分 HTML，且 workflow 最終判定失敗

### Requirement: E2E Runtime Improvement Measurement

E2E workflow 變更 SHALL 以至少三次成功的改造前與改造後 run 比較
critical-path wall-clock 與總 runner-minutes。critical path SHALL 從 E2E matrix
開始計算至 merge HTML artifact 上傳完成；成功門檻 SHALL 為改造後 P50 critical
path 不高於基線 P50 的 70%，且總 runner-minutes 不超過基線的 1.5 倍。未達
門檻時 SHALL NOT 將 change 標記為完成。

#### Scenario: 效能改善達標

- **GIVEN** 三次以上成功的 baseline 與 after run 數據
- **WHEN** 綜合計算 P50 critical path 與 runner-minutes
- **THEN** after critical path ≤ baseline 的 70%，runner-minutes ≤ baseline 的 1.5 倍，並記錄每片 duration

#### Scenario: 效能未達標時不得誤報完成

- **WHEN** after run 未達任一門檻
- **THEN** 保留變更為未完成，並調整 shard／warmup 成本或回退低收益工作，不以測試全綠取代效能驗收

### Requirement: Production Release Readiness Verification
正式對外 release 前，系統 SHALL 完成一次於 production 主機以 immutable image tag（版本號或 commit SHA，禁止 `latest`）執行的實機部署驗證，涵蓋 registry 認證、runtime secrets 齊備檢核、資料庫 migration 與 health check；且 release HEAD SHALL 具備可追溯的 GitHub CI 與 E2E workflow run 證據。當 branch protection 設定無法以 GitHub API 驗證（如 plan 限制回應 403）時，維運者 SHALL 以替代方式（UI 檢視、`gh api` rulesets endpoint 或 ruleset export）驗證並將程序與結果留存於部署文件。

#### Scenario: First production deploy verified with immutable tag
- **GIVEN** production 主機已完成 `docker login ghcr.io`（classic PAT，`read:packages`）且 runtime secrets/env（含 fail-closed 變數）齊備
- **WHEN** 維運者以 immutable `BLOG_IMAGE_TAG` 執行 `deploy.sh`
- **THEN** 部署流程依序完成 image pull、資料庫 readiness、`prisma migrate deploy` 與 `localhost:3100` health check，且結果記錄於部署驗證紀錄

#### Scenario: Deploy rejected without immutable tag
- **WHEN** `BLOG_IMAGE_TAG` 未設定或為可變 tag（如 `latest`）
- **THEN** 部署腳本拒絕執行並回報錯誤

#### Scenario: Release HEAD has CI and E2E run evidence
- **GIVEN** 一個 develop→main 的 release PR
- **WHEN** 該 PR 觸發 CI 與 E2E workflows
- **THEN** release HEAD 具備 branch protection 綁定的全部 required status contexts（`Lint`/`Type Check`/`Unit Tests`/`Build`，涵蓋當時 CI 矩陣的所有 Node 版本）與 E2E run 的可追溯紀錄

#### Scenario: Branch protection verified via alternative when API returns 403
- **GIVEN** `gh api` 查詢 branch protection 因 GitHub plan 限制回應 403
- **WHEN** 維運者改以 UI 檢視、rulesets endpoint 或 ruleset export 驗證 `main` 的保護設定
- **THEN** 驗證程序與結果被記入 `docs/deployment.md`，且不阻擋 release 流程

### Requirement: E2E Gate Trigger Scope
E2E workflow(`e2e.yml`)SHALL 僅由 Pull Request(目標 `main` 或 `develop`)與
`workflow_dispatch` 觸發,SHALL NOT 保留 `push` 觸發。理由:release PR(release/vX→main)
的 E2E 已驗證與 merge 後 main HEAD 幾乎相同的內容,push→main 重跑屬冗餘;功能閘門由
PR→develop 承擔,release 閘門由 PR→main 承擔。PR E2E SHALL 驗證 GitHub 為該 PR
評估的合併結果;若日後 merge queue、合併後自動改寫或部署流程產生未經 PR 驗證的程式內容,
系統 SHALL 另提供 post-merge smoke 或等效閘門,不得默認此條件仍成立。

#### Scenario: Release PR runs E2E as the release gate
- **GIVEN** 一個 `release/vX.Y.Z` → `main` 的 Pull Request
- **WHEN** PR 建立或更新
- **THEN** E2E workflow 被觸發並作為 release 前的最後 E2E 防線

#### Scenario: Merge to main does not re-run E2E
- **GIVEN** 一個 release PR 通過全部檢查後被 merge 到 `main`
- **WHEN** merge commit 被 push 到 `main`
- **THEN** E2E workflow 不被觸發;若 merge commit 符合 `docker-build.yml` 的 branch
  `paths` 過濾,post-merge 驗證由其內部 reusable CI(lint / typecheck / unit /
  integration / build)提供;若僅修改文件而未符合 path filter,則不宣稱有 post-merge
  CI,且不因此重新啟用 E2E。

#### Scenario: Manual E2E run remains available
- **WHEN** 維運者以 `workflow_dispatch` 手動觸發 E2E workflow
- **THEN** E2E 完整執行,不受 branch 觸發規則限制


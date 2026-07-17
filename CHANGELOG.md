# Changelog

All notable changes to this project will be documented in this file.

## 1.5.0 — 2026-07-18 — 升級 Next.js 16 / React 19 並完成 react-hooks v6 規則清理

框架基線升級:Next.js 16.2.10(Turbopack 預設)、React 19.2.7、ESLint 9 Flat Config。
同步完成 react-hooks v6 新規則全部 14 處命中之重構(不改變可觀察行為),並移除升級期間的
warn 降級 override,lint gate 恢復上游 error 嚴格度。

### 新增功能 (feat)
- **deps**: 升級 Next.js 16.2.10 + React 19.2.7 與 ESLint 9 Flat Config

### 重構與優化 (refactor)
- **infra**: 主題與 hydration 狀態管理改為 `useSyncExternalStore`(SSR/hydration 契約不變)
- **view**: 前台導航與目錄元件消除多餘的 Effect 狀態同步
- **view**: 後台管理元件消除 Effect 並補上初始 fetch race guard
- **controller**: 後台分析事件查詢的預設時間推導抽為純函式

### 測試與維運 (test/ci/docs/chore)
- **ci**: PR 觸發之 Docker build 與 health smoke gate
- **test**: E2E h1 斷言改用 getByRole;新增 navbar 與 use-hydrated 行為測試
- **chore**: 移除 react-hooks 規則 warn 例外配置,恢復 eslint-config-next@16 預設嚴格度
- **docs**: 框架版本/ESLint 設定參照更新至 Next.js 16 基線;同步 ci-cd-pipeline 規格

## 1.4.9 — 2026-07-17 — 實作內容管線以統一消毒與渲染準備邏輯

實作內容管線 (Content Pipeline) 以統一內容消毒與渲染準備邏輯，重構現有用例，並於前台部落格及關於我頁面整合內容管線渲染策略。

### 新增功能 (feat)
- **content-pipeline**: 實作內容管線以統一消毒與渲染準備邏輯並重構用例
- **frontend**: 前台部落格與關於我頁面整合內容管線渲染策略

### 測試與維運 (test/ci/docs)
- **test**: 新增內容管線單元測試，並更新相關測試用例
- **spec**: 新增內容管線領域詞彙與更新渲染路徑規格描述

## 1.4.8 — 2026-07-14 — 新增「關於我」前台展示與後台編輯功能

實作「關於我」(About Me) 頁面與編輯功能。新增資料庫欄位遷移、API 路由、後台編輯表單與前台展示頁面，並補齊相關測試。

### 新增功能 (feat)
- **about**: 實作「關於我」設定與內容更新的領域邏輯、API 路由與單元測試
- **about**: 實作後台「關於我」編輯頁面、表單元件與前台展示頁面
- **about**: 整合前台導覽列與後台設定表單以支援關於我選項

### 重構與優化 (refactor)
- **editor**: 新增內容編輯器欄位共享元件，並抽離重構文章編輯器面板

### 測試與維運 (test)
- **test**: 新增關於我頁面之 E2E 測試與 API 單元測試

## 1.4.7 — 2026-07-14 — Newsletter CAPTCHA 失敗原因記錄

生產環境回報 newsletter 訂閱表單以有效輸入送出仍收到泛化 400 錯誤。診斷過程中發現
CAPTCHA 驗證失敗的具體原因（`not-configured`／`missing-token`／`provider-error`／
`invalid-token`／`hostname-mismatch`）從未被記錄，即使有完整 production log 存取權也
無法判斷根因。本版本補上該診斷缺口，不改變任何對外可見行為。

### 問題修復 (fix)
- **newsletter**: `subscribe()` 的 `SubscribeResult` 於 `captcha-failed` 狀態下攜帶具體
  `reason`；伺服器端日誌（`logSubscribeResult`）記錄該原因供診斷，用戶端回應仍維持同一則
  泛化 400 訊息不變，不對外洩漏設定細節

### 測試與維運 (test)
- **test**: 新增／更新 use-case、route observability 與 integration 測試，鎖定 `reason`
  正確傳遞且敏感欄位（token／email／IP）仍不進入日誌

## 1.4.6 — 2026-07-13 — E2E sharded 測試優化與 CI 診斷強化

優化 Playwright E2E 套件執行方式並強化 CI 環境的診斷與相依性管理，降低 CI 執行時間並提升失敗時的可觀察性。

### 測試與維運 (test/ci)
- **e2e**: 將 E2E 套件拆分為 3 個 shard 並平行執行，搭配 Playwright browser binary 快取
  （以實際安裝版本而非 semver range 作為 cache key）縮短 CI 執行時間
- **e2e**: 新增 `scroll-observation` helper 並重構多個 spec 以共用捲動觀察邏輯，移除
  `auth.setup.ts` 改用既有 `helpers/auth` 登入流程
- **ci**: E2E workflow 改用 Node 24 官方 cache action；限縮 Playwright 系統相依安裝範圍
  並於安裝前檢查 runner 相依是否齊備，避免每個 shard 重複執行完整安裝
- **test**: 新增 `optimization-contract` 與 `scroll-observation` 單元測試，鎖定 shard
  設定與捲動觀察行為的契約

## 1.4.5 — 2026-07-13 — 修復 reCAPTCHA render 競態與 sitemap 文章頁缺席

修復 2026-07-13 生產稽核證實的兩個缺陷：首頁與文章頁 Newsletter 訂閱表單的 reCAPTCHA
widget 因 Google `api.js` 兩段式載入競態而保持空白（訪客無法完成訂閱，P0）；`/sitemap.xml`
因 build 時靜態化加上靜默錯誤回退，永久只含 2 條 URL、所有文章頁缺席（傷害 SEO 收錄）。

### 問題修復 (fix)
- **recaptcha**: widget 僅在 `grecaptcha.render` 確實可呼叫後才渲染（`grecaptcha.ready()`
  佇列 + 有界輪詢備援 + 元件自持的 readiness deadline；script `load` 不再清除唯一的
  readiness timer）；render 呼叫失敗改走可恢復的「重新載入驗證」UI，消除空白 widget 的靜默失敗
- **recaptcha**: 以世代序號與 cleanup ref 使 retry/unmount 後的 stale ready/polling
  callback 失效，避免重複 render、卸載後改寫狀態或跨 instance 清除他人已成功的 widget
- **sitemap**: 加入 `force-dynamic`，改為請求時產生並收錄已發佈、未刪除、已到發佈時間的
  文章 URL（含 `lastModified`）；DB 不可用時回退基本頁面（HTTP 200）並記錄穩定事件碼，不輸出
  raw error/stack/DSN/secret，production canonical URL 不再落到 `example.com` placeholder

### 測試與維運 (test/docs)
- **test**: 新增 reCAPTCHA 兩段式載入、render 逾時、render 拋錯、retry/unmount stale
  callback 等韌性單元測試，以及 sitemap 收錄/可見性契約/DB 失敗安全回退/canonical host 測試
- **docs**: 新增 `docs/runbooks/sitemap-operability.md`（sitemap 收錄範圍界線與可運維性）

## 1.4.4 — 2026-07-12 — 修復首頁訂閱表單不可用（reCAPTCHA site key 供應鏈）

v1.4.3 production 首頁「訂閱電子報」區塊顯示「目前無法使用訂閱功能，請稍後再試」。
根因為 GitHub repo secret `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 從未設定：CI 建置 image
時 build-arg 靜默解析為空字串並內嵌進 client bundle（`NEXT_PUBLIC_*` 為 build-time
內嵌，僅設伺服器 `.env` 對前端無效），觸發前端 fail-closed 降級。secret 已補設，
本版重建 image 使 site key 正確內嵌。

### CI 防護 (ci)
- **docker-build**: 新增 build secrets 完整性檢查——release tag 建置缺
  `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `NEXT_PUBLIC_SITE_URL` 即 fail、
  main/dispatch 建置僅警告，杜絕缺 secret 靜默建出降級 image

### 文件 (docs)
- **deploy**: 修正 reCAPTCHA site key 部署說明——明確區分 GitHub secret
  （build-time）與伺服器 `.env`（執行期），並新增 release 前 secret 檢查清單
- **knowledge**: 留存 v1.4.3 事故完整調查與修正方案
  （`docs/knowledge/newsletter-recaptcha-unavailable/`）

## 1.4.3 — 2026-07-12 — E2E 測試穩定性強化與 hydration 根因修復

修正 CI E2E 間歇性失敗的根因。最關鍵者為 ThemeProvider 以 mounted 條件切換 Fragment/Provider，
導致每次 hydration 後 body 以下整棵 SSR DOM 被靜默卸載重建（dev 與 production 皆然）——
除浪費 SSR 成果外，raw-html iframe 因此 detach/reattach 重載，E2E 互動跨越該時窗即以
「Unable to adopt element handle from a different document」隨機失敗。

### 修正 (fix)
- **theme**: ThemeProvider 無條件渲染 Context.Provider，hydration 後不再整頁 remount（根因）
- **raw-html**: iframe 高度回報改為握手機制——父頁面掛載後主動請求重報，修復 remount 消失後初始高度訊息丟失、iframe 高度卡在預設 600px 的衍生問題
- **navbar**: header 搜尋欄加上 hydration gate，避免 hydration 完成前的輸入遺失（同步修正 E2E 搜尋測試逾時）

### 測試優化 (test)
- **e2e**: 新增回歸鎖定——hydration 不得丟棄 SSR DOM、iframe 自動高度必須生效
- **e2e**: global setup 暖機 notFound() 路徑，避免 Next.js dev InvariantError 使草稿 404 測試誤判為 500
- **e2e**: ISR 文章頁與 newsletter 首次 API 命中改用事件等待並放寬冷編譯預算
- **e2e**: raw HTML 行動視覺基準改用固定尺寸 clip，消除 iframe 高度 ±2px 抖動造成的尺寸不符失敗

## 1.4.2 — 2026-07-12 — 提升 E2E 測試穩定性

優化 a11y E2E 測試中的 hydration 欄位檢查，提高測試在時序競爭下的穩定度。

### 測試優化 (test)
- **e2e**: 在焦點操作前等待欄位與按鈕啟用，防止 a11y 測試聚焦於未完成 hydration 的 SSR DOM

## 1.4.1 — 2026-07-12 — 修正搜尋與訂閱設定整合

優化 Newsletter 後台控制開關與 header 搜尋欄導覽狀態清理，並補齊權限佈建 migration 與部署先決條件說明。

### 新增功能 (feat)
- **admin**: 啟用後台站台設定中的 Newsletter 訂閱區塊顯示開關
- **navbar**: 於頁面切換或返回首頁時，自動同步與清空 header 搜尋欄的欄位值
- **migration**: 佈建 subscribers:view 訂閱者名單檢視權限以供後台存取

### 文件與規則 (docs/chore)
- **deploy**: 補充 Newsletter 啟用之 reCAPTCHA/env 先決條件與部署指引
- **config**: 導入 GitNexus 程式碼分析規則與引導

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

### 工具警告修復與文件同步 (chore/docs)
- `lint` script 由已棄用的 `next lint` 遷移至 ESLint CLI（`eslint src`，範圍與規則等效，CI job 名與 required status contexts 不變）
- 移除 `docker-compose.yml` obsolete 的 `version: "3.8"`
- `next.config.mjs` 設定 `outputFileTracingRoot`，消除多 lockfile workspace root 推斷警告
- `docs/deployment.md` CI/CD 觸發表對齊實際 workflows（含 `cd.yml` 停用狀態）並新增 branch protection API 403 替代驗證程序

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

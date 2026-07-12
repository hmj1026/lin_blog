# 修正方案：Newsletter reCAPTCHA site key 供應鏈修復

- 根因：見同目錄 `investigation.md` —— GitHub repo secret
  `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 未設定，CI 建出的 client bundle 內嵌空
  site key，前端 fail-closed 顯示「目前無法使用訂閱功能」。
- 前提認知：site key 是**公開值**（本來就會出現在 HTML/JS 中），放 GitHub
  secret 只是集中管理，不是機密保護需求。

## 方案比較

### 方案 A（推薦）：補設 secret + 重建 image + 補設定完整性防護

1. **設定面（立即恢復功能，無需改碼）**
   - 至 Google reCAPTCHA Admin Console 確認/建立 v2 checkbox 金鑰，
     網域涵蓋 `linstar.win`, `www.linstar.win`, `nx.linstar.win`。
   - `gh secret set NEXT_PUBLIC_RECAPTCHA_SITE_KEY`（repo-level，與
     docker-build.yml 讀取層級一致）。
   - production 主機根目錄 `.env` 確認三個執行期變數已設且正確：
     `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`（供 compose build fallback 一致性）、
     `RECAPTCHA_SECRET_KEY`、`RECAPTCHA_ALLOWED_HOSTNAMES`。
   - 觸發 CI 重建 image（cut v1.4.4 或 rebuild v1.4.3 平台 tag），部署後驗證。
2. **防護面（防復發，小量改碼）**
   - `docker-build.yml` 加一個前置 step：release tag 建置時，若
     `secrets.NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 為空即 fail（或至少
     `::warning::`），把「靜默空值」變成建置期錯誤。
   - `docs/deployment.md` 升級手冊補「release 前 secret 檢查清單」一節，
     列出所有 build-time `NEXT_PUBLIC_*` secrets（GA/GTM/FB Pixel 同列）。
3. **驗證**
   - 部署後 smoke：首頁訂閱區塊渲染表單 + reCAPTCHA widget（非錯誤文案）；
     實際完成一次訂閱流程（API 回 success envelope）。
   - 以實際 site key 值（公開值）grep 頁面與 JS bundle，確認已內嵌非空 key，
     例如 `curl -s https://nx.linstar.win | grep -c '<實際site key>'`。

- 優點：直接修源頭；防護把同型問題（GA/GTM key 也缺）一併攔下。
- 風險：低。需要一次 image 重建與部署窗口。

### 方案 B：改為執行期注入（runtime env 讀取 site key）

把 site key 從 build-time 內嵌改為執行期供應：SSR 時由 server 讀
`process.env` 並透過 props / route handler 傳給 client 元件，image 便與
key 解耦（同一 image 各環境可用不同 key）。

- 優點：消除「NEXT_PUBLIC build-time 內嵌」這整類坑；image 可跨環境重用。
- 缺點：改動面大（`env.public.ts` 契約、NewsletterForm props 鏈、測試、
  E2E stub 注入路徑 `e2e-test` site key 機制都要動）；違反「最小變更」原則；
  且站上其他 `NEXT_PUBLIC_*`（GA/GTM）仍是 build-time，模式分裂。
- 結論：不採用（目前單一 production 環境，build-time 內嵌成本可接受）。

### 方案 C：僅在主機 `.env` 設定並改用本機 `docker compose build`

- 缺點：偏離既有 GHCR image 發佈流程（`BLOG_IMAGE_TAG` 強制 immutable tag
  的設計意圖就是禁止本機隨手 build），且問題會在下次 CI 部署復發。
- 結論：不採用。

## 推薦：方案 A

理由：功能恢復只差一個 secret + 一次重建；同時把「缺 secret 靜默通過」升級為
建置期防護，成本最低、覆蓋同型風險（GA/GTM/FB Pixel secrets 同樣缺失）。

## 待辦（依序）

- [ ] 1. Google Admin Console 確認 v2 金鑰與網域白名單
- [ ] 2. `gh secret set NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- [ ] 3. 主機 `.env` 確認 `RECAPTCHA_SECRET_KEY` / `RECAPTCHA_ALLOWED_HOSTNAMES`
- [ ] 4. `docker-build.yml` 加 release-tag secret 完整性檢查（改碼，走 PR）
- [ ] 5. `docs/deployment.md` 補 release 前 secret 檢查清單（與 4 同 PR）
- [ ] 6. 重建 + 部署（v1.4.4 或 rebuild），smoke 驗證首頁訂閱流程
- [ ] （可選）7. 一併補 `NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_GTM_ID` 已設但
      `NEXT_PUBLIC_FB_PIXEL_ID` 未設的盤點，決定要設值或明確留空

## 測試計畫

- 防護面（步驟 4）：workflow 檢查邏輯屬 CI YAML，以 staging tag 或
  workflow_dispatch 演練「secret 缺失 → build fail」與「secret 存在 → 通過」。
- 功能面：現有 E2E `newsletter-subscribe.spec.ts` 已覆蓋表單行為（以
  `e2e-test` stub），production 驗證靠部署後 smoke（真實 reCAPTCHA 無法
  自動化，人工完成一次訂閱）。

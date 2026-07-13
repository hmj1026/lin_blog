# Sitemap 範圍與可運維性 Runbook

適用範圍：`fix-recaptcha-render-race-and-sitemap` change 修復後的 `web/src/app/sitemap.ts`
（`/sitemap.xml` metadata route）。本文件記錄 sitemap 的收錄範圍界線與錯誤處理／log
抑制策略，供運維與後續擴充時對照。

## 收錄範圍（Scope）

- **產生時機**：route 宣告 `export const dynamic = "force-dynamic"`，於**請求時**產生。
  build 時不連 DB、不固化內容（docker build 期間 DB 不可達）。若未來改用 revalidation，
  必須在本文件與規格明文記錄有界 window（例如 `revalidate = 3600`）。
- **收錄內容**：
  - 基本頁面：首頁 `/` 與文章列表 `/blog`。
  - 文章頁 `/blog/<slug>`：僅收錄**已發佈、未刪除且已到 `publishTime`** 的文章，
    附 `lastModified`（優先取 `publishedAt`，缺少時回退 `updatedAt`）。可見性過濾由
    repository 的 `listPublishedForSitemap` 查詢負責（`status = PUBLISHED`、
    `deletedAt = null`、`publishTimeReached`）；sitemap route 只忠實映射查詢結果，
    不自行新增 URL。
- **明確不處理（Non-Goals）**：
  - **不**收錄分類（category）與標籤（tag）頁。若日後需要，另開 change 擴充收錄範圍。
  - **不**產生 sitemap index 或做 sitemap splitting。單一 sitemap 的 URL 數／檔案大小
    接近 [sitemap protocol 上限](https://www.sitemaps.org/protocol.html)（50,000 URL 或
    50 MB 未壓縮）時，需另開 scalability change 導入 sitemap index。目前文章量遠低於上限。

## Canonical host

- 所有 URL 使用已驗證的 `NEXT_PUBLIC_SITE_URL` 作為 canonical host。
- **production 不得**使用 `https://example.com` placeholder。缺少 `NEXT_PUBLIC_SITE_URL`
  視為部署設定錯誤：runtime 會記錄穩定事件碼 `sitemap.base_url.misconfigured`
  （`code: SITE_URL_MISSING`，不 5xx、不輸出值），真正的把關在部署驗證（deployment
  contract 缺值時應擋下上線）。

## 錯誤處理與可運維性（Operability）

- **DB 不可用時**：route 回退為僅含基本頁面（`/`、`/blog`）的清單並回應 **HTTP 200**
  （sitemap 不得 5xx），同時以既有 structured logger 記錄穩定事件碼
  `sitemap.generate.error`（`code: POST_QUERY_FAILED`）。
- **不得洩漏**：錯誤記錄**不得**輸出 raw `Error`、stack trace、DB 連線字串／DSN、
  secret 或文章內容——僅記錄穩定事件碼與 code。
- **Log spam 抑制**：`force-dynamic` 代表每次請求都查 DB；DB outage 期間爬蟲 retry 可能
  造成 `sitemap.generate.error` 重複刷屏。抑制策略由既有 logger／observability 層負責：
  - 於 log pipeline／告警規則對此事件碼設 rate limit 或去重（例如每分鐘上限、或以事件碼
    聚合），**不**在 route 內自行實作節流以免增加狀態與複雜度。
  - 觀察到持續 `sitemap.generate.error` 應視為 DB 健康問題的訊號，循一般 DB outage 流程處理。

## 驗證

- 無 DB 連線環境執行 `npm run build` 不得失敗（route 為 force-dynamic，不於 build 連 DB）。
- 可連 DB 的 runtime 於 build 後新增並發佈測試文章，請求 `/sitemap.xml` 應含新 slug 與
  `lastModified`。
- 模擬 DB outage 時，`/sitemap.xml` 應回 HTTP 200、僅含基本頁面，且 log 不含敏感資料。
- 單元測試：`web/tests/unit/app/sitemap.test.ts`。

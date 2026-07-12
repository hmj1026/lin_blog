# 調查：v1.4.3 首頁訂閱電子報區塊顯示「目前無法使用訂閱功能，請稍後再試。」

- 調查日期：2026-07-12
- 狀態：根因已確認（Phase 1-3 完成）
- 影響範圍：production 首頁（及文章頁側欄）Newsletter 訂閱表單整體不可用

## Phase 1：問題釐清

| 項目 | 內容 |
|------|------|
| 預期行為 | 首頁訂閱區塊顯示姓名/Email 欄位 + reCAPTCHA widget，可送出訂閱 |
| 實際行為 | 顯示錯誤文案「目前無法使用訂閱功能，請稍後再試。」且按鈕 disabled |
| 環境 | production（GHCR image `ghcr.io/hmj1026/lin_blog:v1.4.3`，經 docker compose 部署） |
| 可重現性 | 穩定重現（非 flaky）——由程式碼靜態條件決定，非執行期間歇故障 |
| 背景 | `fix-v140-post-deploy-issues` 已處理 newsletter toggle / 權限問題，但未涉及 reCAPTCHA key 供應鏈 |

## Phase 2：證據蒐集

### 證據 1：錯誤文案的唯一渲染條件（程式碼層）

`web/src/components/newsletter-form.tsx:153-154, 361-364`：

```tsx
const siteKey = publicEnv.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const captchaUnavailable = !siteKey;
...
{captchaUnavailable ? (
  <p>目前無法使用訂閱功能，請稍後再試。</p>
```

→ 此訊息**只有一個觸發條件**：client bundle 中 `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 為空。

### 證據 2：`NEXT_PUBLIC_*` 是 build-time 內嵌（Next.js 機制層）

- `newsletter-form.tsx` 是 `"use client"` 元件；`env.public.ts` 讀取的
  `process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 由 Next.js 在 `npm run build`
  時**靜態取代進 bundle**。
- 因此 `docker-compose.yml` 執行期 `environment:` 段落設定的
  `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${NEXT_PUBLIC_RECAPTCHA_SITE_KEY:-}`
  **對 client bundle 無效**（只影響 server-side process.env）。

### 證據 3：production image 由 CI 建置，key 來自 GitHub secret

- `docker-compose.yml` 使用 `image: ghcr.io/hmj1026/lin_blog:${BLOG_IMAGE_TAG}`
  —— 部署時是「拉 CI 預建 image」，不是本機 build（`build:` 段僅供手動
  `docker compose build` 使用）。
- `.github/workflows/docker-build.yml:82`：
  `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${{ secrets.NEXT_PUBLIC_RECAPTCHA_SITE_KEY }}`
- 該 build job **未綁定任何 GitHub environment**，使用 repo-level secrets。

### 證據 4：repo secrets 缺少該 key（決定性證據）

`gh secret list`（2026-07-12 查詢）：

```
NEXT_PUBLIC_GTM_ID      2025-12-30
NEXT_PUBLIC_SITE_URL    2025-12-29
```

→ **`NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 不存在**（`NEXT_PUBLIC_GA_ID`、
`NEXT_PUBLIC_FB_PIXEL_ID` 亦缺，屬同型問題但非本次主訴）。
GitHub Actions 對不存在的 secret 解析為**空字串**，不會報錯。

### 證據 5：時間線

| 時間 | 事件 |
|------|------|
| 2026-07-11 | `c26e32e` 將 `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` build-arg 加入 `docker-build.yml`（為 v1.4.3 祖先） |
| 2026-07-12 | v1.4.3 釋出；CI 建 image 時 secret 缺失 → ARG 解析為空 → Dockerfile `ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY=`（預設空）→ bundle 內嵌空值 |

## Phase 3：根因分析

### 資料流（斷點標示）

```
GitHub repo secret（❌ 未設定）
  → docker-build.yml build-args（解析為空字串，靜默通過）
  → Dockerfile ARG/ENV（預設即空，無警告）
  → next build 內嵌 client bundle（空字串）
  → publicEnv.NEXT_PUBLIC_RECAPTCHA_SITE_KEY 為空
  → captchaUnavailable = true
  → 首頁顯示「目前無法使用訂閱功能，請稍後再試。」
```

### 單一假設與驗證

- 假設：「repo secret `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` 未設定，導致 CI 建出的
  bundle 內嵌空 site key」。
- 驗證：`gh secret list` 直接證實 secret 不存在（證據 4）；且錯誤文案的唯一
  觸發條件即空 site key（證據 1），無其他分支可達此 UI 狀態。

### 根本原因

**設定供應鏈斷裂**：reCAPTCHA site key 的傳遞鏈（GitHub secret → CI build-arg
→ Docker ARG → Next.js build-time 內嵌）中，源頭 secret 從未建立；整條鏈每一層
都「允許空值靜默通過」（Dockerfile ARG 預設空、Actions 缺 secret 不報錯、
env.public.ts schema `optional()`），因此問題直到 production UI 才顯現。

註：這是設計上的 fail-closed 行為（缺 key 時前端顯示不可用、後端拒驗證），
行為本身正確；缺陷在於**缺乏部署前的設定完整性檢查**，讓 fail-closed 靜默
到達 production。

### 附帶確認（不在本次主訴、但修復時必須一併處理）

即使補上前端 site key，後端驗證需要執行期 env：`RECAPTCHA_SECRET_KEY` 與
`RECAPTCHA_ALLOWED_HOSTNAMES`（缺一即 fail closed，見
`web/src/modules/newsletter/infrastructure/captcha/config.ts:32`）。此二值設定
於 production 主機根目錄 `.env`（docker-compose 執行期注入），本次調查無法從
開發機直接驗證主機 `.env` 是否已設 —— 修復步驟需在主機上確認。

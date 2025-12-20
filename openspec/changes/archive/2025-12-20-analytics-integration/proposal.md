# Analytics Integration Proposal

## Why
目前專案尚未整合外部追蹤工具（如 Google Analytics, Facebook Pixel）。為行銷與流量分析需求，需提供一種簡單的方式（透過環境變數）來啟用這些功能，而不需修改程式碼。

## What Changes

### 1. Environment Variables
在 `web/src/env.ts` 新增以下選填變數：
- `NEXT_PUBLIC_GA_ID`: Google Analytics Measurement ID (例如 `G-XXXXXXXXXX`)
- `NEXT_PUBLIC_GTM_ID`: Google Tag Manager ID (例如 `GTM-XXXXXXX`)
- `NEXT_PUBLIC_FB_PIXEL_ID`: Facebook Pixel ID

### 2. Dependencies
新增 `@next/third-parties` 套件，利用其優化的載入策略 (Next.js 14+ 推薦做法)。
- `npm install @next/third-parties`

### 3. Components
建立 `web/src/components/analytics-provider.tsx`：
- 讀取 ENV。
- 根據 ENV 存在與否，渲染 `<GoogleAnalytics>`, `<GoogleTagManager>` 或自定義 FB Pixel Script。

### 4. Layout
在 `web/src/app/layout.tsx` 引入 `AnalyticsProvider`。

## Impact
- **Performance**: 使用 `@next/third-parties` 會自動優化 script 載入順序，降低對 Web Vitals 的影響。
- **Configurability**: 僅需設定 ENV 即可啟用，Dev 環境可留空以關閉。

## Security & Privacy
- ID 公開於 Client 端 (預期行為)。
- 建議使用者需自行處理 Cookie Consent Banner (尚未包含在本提案範圍，本提案僅負責埋 Code)。

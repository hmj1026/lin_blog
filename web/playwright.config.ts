import { defineConfig, devices } from "@playwright/test";
import { AUTH_FILE } from "./tests/e2e/helpers/auth";

// 只需 admin 權限、沒有公開／其他角色語意的 spec：由 chromium-authed 執行，
// 重用 global-setup.ts 產生的共用 storageState，測試本體不再重複登入。
// 混合角色（如 admin-subscribers 的 EDITOR／匿名子群組）仍用局部 test.use
// 清空 state；手動 browser.newContext() 不會自動繼承這裡的 project state，
// 相關 spec 已個別明確處理（見 tasks 1.4-1.6）。
const AUTHED_SPECS = [
  "admin-editor-modes.spec.ts",
  "admin-management.spec.ts",
  "admin-posts.spec.ts",
  "admin-post-editor-layout.spec.ts",
  "admin-raw-media.spec.ts",
  "admin-subscribers.spec.ts",
];

export default defineConfig({
  testDir: "./tests/e2e",
  // dev server 冷編譯暖機（見 tests/e2e/global-setup.ts 開頭註解）：在任何
  // spec 執行前先登入並造訪熱門路由，避免各檔案 beforeAll 內的登入流程撞上
  // 首次命中路由的即時編譯，拖垮 waitForURL 預算並導致整份 serial describe
  // 檔案 did-not-run。
  globalSetup: require.resolve("./tests/e2e/global-setup.ts"),
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  fullyParallel: true,
  // Next.js dev server 會依首次請求即時編譯路由；固定單一 worker 避免多個
  // E2E 檔案同時登入／觸發 cold compile。測試不得靠 retry 掩蓋不穩定失敗。
  workers: 1,
  retries: 0,
  // CI 跨 3 個 runner 分片執行（e2e.yml），每片各自產生 HTML 沒有意義；改用
  // blob + list，e2e.yml 的 merge-reports job 下載所有分片 blob 後合併成單一
  // HTML artifact（design D5）。本機單機執行仍用 list + html，方便
  // `npx playwright show-report` 直接看結果。retries: 0 下 on-first-retry
  // 永不觸發，trace 統一在失敗時保留，讓 CI artifact 有可分析的證據。
  reporter: process.env.CI
    ? [["list"], ["blob", { outputDir: "blob-report" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium-authed",
      testMatch: AUTHED_SPECS,
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
    },
    {
      name: "chromium-anon",
      testIgnore: AUTHED_SPECS,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      NEXT_PUBLIC_GA_ID: "G-TEST123",
      NEXT_PUBLIC_GTM_ID: "GTM-TEST123",
      NEXT_PUBLIC_FB_PIXEL_ID: "1234567890",
      // 可控 CAPTCHA 測試替身（openspec add-reader-discovery-and-subscriptions
      // tasks.md 9.5）：僅供 Playwright E2E 使用，兩者必須同時出現，且只能出現
      // 在這個 webServer.env（絕不寫入 .env 檔案）。伺服器端 gate
      // （NEWSLETTER_CAPTCHA_TEST_DOUBLE + 非 production NODE_ENV）見
      // src/modules/newsletter/infrastructure/captcha/test-double.ts；客戶端
      // stub widget gate（特殊 site key + 非 production）見
      // src/components/newsletter-form.tsx。`npm run dev` 永遠是 development，
      // 因此這裡設定的旗標不會出現在正式 production 建置。
      NEWSLETTER_CAPTCHA_TEST_DOUBLE: "1",
      NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "e2e-test",
      // Keep the process-local limiter short in the isolated E2E server so a
      // rerun cannot inherit a ten-minute window from a previous run.
      NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS: "5",
      NEWSLETTER_RATE_LIMIT_MAX: "5",
      // Discovery failure-isolation fault injection（server-only；見
      // src/lib/server/discovery-fault-injection.ts）：僅啟用 hook，實際注入
      // 仍須單一請求攜帶 e2e-discovery-fault=1 cookie 才觸發。
      DISCOVERY_FAULT_INJECTION: "1",
    },
  },
});

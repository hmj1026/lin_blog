import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5 * 1000,
  },
  fullyParallel: true,
  // Next.js dev server 會依首次請求即時編譯路由；固定單一 worker 避免多個
  // E2E 檔案同時登入／觸發 cold compile。測試不得靠 retry 掩蓋不穩定失敗。
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
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

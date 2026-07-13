import { chromium, type FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";
import { loginAsAdmin, AUTH_FILE } from "./helpers/auth";

const WARMUP_TIMEOUT_MS = 90_000;

/**
 * Playwright globalSetup：暖機 Next.js dev server 的熱門路由，並產生共用
 * admin storageState。
 *
 * dev server 對每個路由的第一次請求會即時編譯（cold compile），在 CI 較慢的
 * runner 上單一路由可能耗費超過各 spec 檔案 beforeAll 內登入流程的
 * waitForURL 預算（10–15 秒）。若「登入」本身撞上 /login 或 /admin 的冷編譯，
 * 會直接導致整份 serial describe 檔案的 beforeAll 逾時，使檔案內所有測試被
 * 標記為 did-not-run（見 playwright.config.ts 的 workers:1 註解；診斷順序見
 * e2e-runner trap sheet：先排除測試工具／環境本身的時機效應，而非誤判為
 * app 邏輯錯誤）。
 *
 * 這裡在任何 spec 開始前，用一個獨立、用完即丟的 context 依序造訪熱門路由，
 * 讓對應的 webpack chunk 在測試開始前就編譯完成。admin 暖機登入完成、熱門
 * 路由都造訪過後，把該 context 的 storageState 寫到 `AUTH_FILE`，供
 * `chromium-authed` project 與需要手動 context 的 spec 重用，純 admin spec
 * 不需要再各自跑一次 UI 登入。每個 CI shard 有自己的 DB 與 dev server，因此
 * 每片都會各自產生一次 state，不跨 runner 共用。
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const browser = await chromium.launch();

  try {
    const adminContext = await browser.newContext({ baseURL });
    const adminPage = await adminContext.newPage();
    adminPage.setDefaultTimeout(WARMUP_TIMEOUT_MS);
    adminPage.setDefaultNavigationTimeout(WARMUP_TIMEOUT_MS);

    try {
      // 統一走共用登入 helper；冷編譯下 /login 與 /admin 首次命中較慢，放寬預算
      await loginAsAdmin(adminPage, { timeout: WARMUP_TIMEOUT_MS });

      const hotAdminRoutes = [
        "/admin",
        "/admin/posts",
        "/admin/posts/new",
        "/admin/media",
        "/admin/subscribers",
      ];
      for (const route of hotAdminRoutes) {
        await adminPage.goto(route);
      }

      fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
      await adminContext.storageState({ path: AUTH_FILE });
    } finally {
      await adminContext.close();
    }

    const anonContext = await browser.newContext({ baseURL });
    const anonPage = await anonContext.newPage();
    anonPage.setDefaultTimeout(WARMUP_TIMEOUT_MS);
    anonPage.setDefaultNavigationTimeout(WARMUP_TIMEOUT_MS);

    try {
      await anonPage.goto("/blog");
      const firstPostHref = await anonPage
        .locator("a[href^='/blog/']")
        .first()
        .getAttribute("href");
      if (firstPostHref) {
        // 暖機 /blog/[slug] 動態路由：一般文章與 raw HTML 文章共用同一支
        // page.tsx，PostDiscoveryPanel／NewsletterForm 等元件的 webpack chunk
        // 在這裡就會編譯完成，覆蓋 newsletter-subscribe.spec.ts 等 spec 後續
        // 動態建立的其他 slug。
        await anonPage.goto(firstPostHref);
      }
      await anonPage.goto("/search?q=warmup");
      // 暖機 notFound() 路徑：/blog/[slug] 對不存在（或草稿）slug 會渲染
      // not-found boundary；dev server 首次冷編譯該 boundary 時，與其他請求
      // 併發可能觸發 Next.js dev 的 InvariantError（Expected
      // clientReferenceManifest to be defined）而回 500，導致
      // isr-draft-preview.spec.ts C（預期 404）誤判。先在任何 spec 前壓實。
      await anonPage.goto("/blog/warmup-not-found-fixture");
    } finally {
      await anonContext.close();
    }
  } finally {
    await browser.close();
  }
}

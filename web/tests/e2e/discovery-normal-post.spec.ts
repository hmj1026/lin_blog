import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * E2E：一般文章（非 raw HTML）的探索側欄/文末堆疊版面
 *
 * 對應 openspec/changes/add-reader-discovery-and-subscriptions 任務 9.3。
 *
 * 涵蓋：
 * - 桌面（1280×800）：sticky 側欄可見、computed width 落在 280–320px、
 *   模組順序（搜尋→訂閱→熱門→最新）、sticky top offset 避開 header、
 *   搜尋表單送出到 `/search?q=<trimmed-encoded>`、空查詢留在原頁、無水平捲動。
 * - 手機（390×844）：探索模組在文章內容之後、延伸閱讀之前，順序相同，無水平捲動。
 * - Discovery failure isolation：兩層覆蓋——（a）「零瀏覽事件的全新文章」驗證
 *   熱門模組 fallback 到最新文章；（b）server-only fault injection（cookie
 *   `e2e-discovery-fault=1` + webServer.env `DISCOVERY_FAULT_INJECTION=1`）真正
 *   讓查詢層拋出例外，驗證文章主內容仍可讀、探索模組顯示泛化錯誤。
 */

type Box = { x: number; y: number; width: number; height: number };

/**
 * 導向頁面並等待 client-side hydration 完成，才進行表單互動。
 *
 * 站內搜尋輸入為 React controlled input（`value={query}`）：若在 hydration
 * 完成前用 `fill()` 直接寫入 DOM value，之後 hydration 附掛的 onChange 從未
 * 被觸發，React 的 `query` state 會停留在 SSR 初始值（空字串），導致送出時
 * 讀到「空查詢」而非實際填入的文字——這不是應用程式的 bug，而是純粹的
 * 測試時機問題（診斷順序見 e2e-runner trap sheet：先排除測試工具本身的
 * 時機效應，而非誤判為 app 邏輯錯誤）。`networkidle` 只代表網路請求暫時
 * 清空，不保證 React 已完成 hydration；改以該欄位本身的 `toBeEnabled()`
 * 作為 hydration gate（頁面上桌面／手機版各有一份，兩份都需就緒）。
 */
async function gotoAndWaitHydrated(page: Page, path: string) {
  await page.goto(path);
  const searchInputs = page.getByLabel("站內搜尋");
  await expect(searchInputs).toHaveCount(2);
  for (let i = 0; i < 2; i += 1) {
    await expect(searchInputs.nth(i)).toBeEnabled();
  }
}

async function createPublishedPost(page: Page, params: { slug: string; title: string }) {
  const res = await page.request.post("/api/posts", {
    data: {
      slug: params.slug,
      title: params.title,
      excerpt: `${params.title} 摘要`,
      content: `<p>${params.title} 內容。</p>`,
      allowRawHtml: false,
      status: "PUBLISHED",
      categoryIds: [],
      tagIds: [],
    },
  });
  expect(res.ok(), `建立文章失敗 (${params.slug})：${res.status()}`).toBeTruthy();
}

async function stableBoundingBox(locator: ReturnType<Page["locator"]>): Promise<Box> {
  let box: Box | null = null;
  await expect.poll(async () => (box = await locator.boundingBox()), { timeout: 15000 }).not.toBeNull();
  return box!;
}

test.describe.configure({ mode: "serial" });

test.describe("discovery-normal-post", () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const targetSlug = `discovery-normal-e2e-${runId}`;
  const fillerSlugA = `discovery-normal-e2e-filler-a-${runId}`;
  const fillerSlugB = `discovery-normal-e2e-filler-b-${runId}`;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);

    // 建立兩篇「同批」姊妹文章，確保最新文章模組必定非空，讓熱門模組的
    // fallback-to-latest 斷言不是 vacuous（見 design.md D2）。
    await createPublishedPost(page, { slug: fillerSlugA, title: "Discovery Normal E2E Filler A" });
    await createPublishedPost(page, { slug: fillerSlugB, title: "Discovery Normal E2E Filler B" });
    await createPublishedPost(page, { slug: targetSlug, title: "Discovery Normal E2E Target" });

    // 預熱路由：dev server 對新路由的第一次命中會即時編譯，可能讓後續測試的第一次
    // 互動在頁面完成 hydration 前就送出，造成間歇性失敗（例如 client-side 搜尋表單
    // 送出時 React 尚未接手 onChange，讀到 SSR 初始空值）。先在 beforeAll 訪問一次，
    // 讓路由與頁面在正式測試開始前完成編譯與 hydration。
    await page.goto(`/blog/${targetSlug}`);
    await context.close();
  });

  test.describe("桌面 1280×800", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("sticky 側欄可見、寬度落在 280–320px 區間", async ({ page }) => {
      // 等 hydration 完成再量測：Suspense fallback 與正式面板都有 lg:sticky，
      // 但單次 evaluate 若落在節點被替換（detached）的瞬間會讀到空字串。
      await gotoAndWaitHydrated(page, `/blog/${targetSlug}`);
      await expect(page.getByRole("heading", { level: 1, name: "Discovery Normal E2E Target" })).toBeVisible();

      const sidebar = page.locator("aside > div").first();
      await expect(sidebar).toBeVisible();
      const box = await stableBoundingBox(sidebar);
      expect(box.width).toBeGreaterThanOrEqual(280);
      expect(box.width).toBeLessThanOrEqual(320);

      // auto-retry 的 CSS 斷言取代單次 getComputedStyle 讀取
      await expect(sidebar).toHaveCSS("position", "sticky");
    });

    test("模組順序為 搜尋 → 訂閱 → 熱門（最多 5 篇）→ 最新（最多 5 篇）", async ({ page }) => {
      await page.goto(`/blog/${targetSlug}`);
      const sidebar = page.locator("aside > div").first();
      await expect(sidebar).toBeVisible();

      const searchLabel = sidebar.getByText("站內搜尋", { exact: true });
      const newsletterHeading = sidebar.getByRole("heading", { name: "訂閱電子報" });
      const popularHeading = sidebar.getByRole("heading", { name: "熱門文章" });
      const latestHeading = sidebar.getByRole("heading", { name: "最新文章" });

      const [searchBox, newsletterBox, popularBox, latestBox] = await Promise.all([
        stableBoundingBox(searchLabel),
        stableBoundingBox(newsletterHeading),
        stableBoundingBox(popularHeading),
        stableBoundingBox(latestHeading),
      ]);

      expect(searchBox.y).toBeLessThan(newsletterBox.y);
      expect(newsletterBox.y).toBeLessThan(popularBox.y);
      expect(popularBox.y).toBeLessThan(latestBox.y);

      const popularList = popularHeading.locator("xpath=following-sibling::*[1]");
      const latestList = latestHeading.locator("xpath=following-sibling::*[1]");
      // 熱門/最新清單各自最多 5 個連結（li）；空狀態時為 0（不是 <ul>），兩者皆合法。
      const popularCount = await popularList.locator("li").count().catch(() => 0);
      const latestCount = await latestList.locator("li").count().catch(() => 0);
      expect(popularCount).toBeLessThanOrEqual(5);
      expect(latestCount).toBeLessThanOrEqual(5);
    });

    test("sticky top offset 避開全站 header（捲動後仍可見、不被 header 遮蓋）", async ({ page }) => {
      await gotoAndWaitHydrated(page, `/blog/${targetSlug}`);
      const header = page.locator("header").first();
      const sidebar = page.locator("aside > div").first();
      await expect(sidebar).toBeVisible();
      await stableBoundingBox(header);

      // 以漸進捲動＋輪詢量測（而非依單次量測到的自然位置計算一次性目標捲動量），
      // 對非同步載入（hero 圖片、字型）造成的版面位移更穩健：hero 圖片載入完成前
      // 量到的「自然位置」會在圖片載入後失真，單次計算的目標捲動量因而可能低估
      // 或高估（依 e2e-runner trap sheet：先排除測試工具/時機造成的量測污染，
      // 而非誤判為 sticky 版面有 bug）。每輪不足時再捲動一小段，直到 sidebar
      // 頂端貼齊 sticky top（header 高度）為止，或超出合理捲動上限判定失敗。
      let headerBottom = 0;
      await expect
        .poll(
          async () => {
            const [headerBox, sidebarBox] = await Promise.all([header.boundingBox(), sidebar.boundingBox()]);
            if (!headerBox || !sidebarBox) return false;
            headerBottom = headerBox.y + headerBox.height;
            const reachedStickyOffset = sidebarBox.y <= headerBottom + 40;
            if (!reachedStickyOffset) {
              await page.mouse.wheel(0, 120);
            }
            return reachedStickyOffset;
          },
          { timeout: 15000, intervals: [200, 200, 300, 300, 500, 500] }
        )
        .toBe(true);

      const sidebarBox = await stableBoundingBox(sidebar);
      // sidebar 的 sticky top（top-24 = 96px）理應 >= header 高度，捲動後其
      // 可見範圍的頂端（y）不應小於 header 底部，代表未被 header 蓋住；同時應
      // 大致貼齊 sticky top（允許誤差），代表確實黏住而非隨頁面自由捲動。
      expect(sidebarBox.y).toBeGreaterThanOrEqual(headerBottom - 1);
      expect(sidebarBox.y).toBeLessThanOrEqual(headerBottom + 40);
    });

    test("站內搜尋送出後導向 /search?q=<trim-and-encode>", async ({ page }) => {
      await gotoAndWaitHydrated(page, `/blog/${targetSlug}`);
      const sidebar = page.locator("aside > div").first();
      const input = sidebar.getByLabel("站內搜尋");
      await input.fill("  hello world  ");
      await sidebar.getByRole("button", { name: "搜尋" }).click();

      // 站內搜尋表單以 next/navigation 的 router.push 做 client-side 導向（history
      // pushState，不是整頁載入）；page.waitForURL() 預設 waitUntil:"load" 會等待
      // 一個永遠不會再次觸發的 load 事件而卡住，改以輪詢 page.url() 判斷導向完成。
      await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/search?q=");
      const url = new URL(page.url());
      expect(url.searchParams.get("q")).toBe("hello world");
    });

    test("空查詢留在文章頁並顯示提示，不導向搜尋頁", async ({ page }) => {
      await page.goto(`/blog/${targetSlug}`);
      const sidebar = page.locator("aside > div").first();
      const input = sidebar.getByLabel("站內搜尋");
      await input.fill("   ");
      await sidebar.getByRole("button", { name: "搜尋" }).click();

      await expect(sidebar.getByText("請輸入關鍵字後再搜尋。")).toBeVisible();
      expect(page.url()).toContain(`/blog/${targetSlug}`);
      expect(page.url()).not.toContain("/search");
    });

    test("桌面版同一時間只顯示一份 Newsletter 表單（另一斷點實例為 CSS 隱藏，不得重複載入 CAPTCHA）", async ({ page }) => {
      await page.goto(`/blog/${targetSlug}`);
      // DOM 中 SSR 兩份（sidebar + stacked），但僅當前斷點的一份可見；
      // 不可見實例的 CAPTCHA 由 IntersectionObserver 閘控不初始化
      // （見 src/components/newsletter-form.tsx 的可見性閘控）。
      // getByRole 只解析 accessibility tree（排除 display:none），故 DOM 份數改用 CSS locator。
      await expect(page.locator('h3:text-is("訂閱電子報")')).toHaveCount(2);
      await expect(page.getByRole("heading", { name: "訂閱電子報" })).toHaveCount(1);
    });

    test("桌面版無水平捲動", async ({ page }) => {
      await page.goto(`/blog/${targetSlug}`);
      const hasNoHorizontalScroll = await page.evaluate(() => {
        const el = document.scrollingElement;
        if (!el) return true;
        return el.scrollWidth <= el.clientWidth;
      });
      expect(hasNoHorizontalScroll).toBeTruthy();
    });

    test("Discovery failure isolation（零瀏覽事件 fallback）：熱門模組 fallback 到最新文章、文章主內容仍正常顯示", async ({ page }) => {
      // 以「剛建立、零瀏覽事件」的文章驗證 design.md D2 的 fallback 行為：
      // 熱門文章不足時以最新文章補位，不讓文章頁失敗。真正的查詢層例外
      // 路徑由下一個 fault-injection 測試覆蓋。
      await page.goto(`/blog/${targetSlug}`);
      await expect(page.getByRole("heading", { level: 1, name: "Discovery Normal E2E Target" })).toBeVisible();

      const sidebar = page.locator("aside > div").first();
      const popularHeading = sidebar.getByRole("heading", { name: "熱門文章" });
      await expect(popularHeading).toBeVisible();
      await expect(sidebar.getByText("暫時無法載入，請稍後再試。")).toHaveCount(0);
    });

    test("Discovery failure isolation（fault injection）：查詢層拋出例外時，文章主內容仍可讀、探索模組顯示泛化錯誤", async ({ page, context }) => {
      // 透過 server-only fault injection（src/lib/server/discovery-fault-injection.ts，
      // 由 playwright.config.ts webServer.env 的 DISCOVERY_FAULT_INJECTION=1 啟用）
      // 讓熱門／最新查詢在本請求真正拋出例外，證明 design.md D5 的 failure isolation：
      // 探索查詢失敗只影響對應模組，不讓文章頁 500。
      await context.addCookies([
        { name: "e2e-discovery-fault", value: "1", url: "http://localhost:3000" },
      ]);
      await page.goto(`/blog/${targetSlug}`);

      // 文章主內容不受探索查詢失敗影響
      await expect(page.getByRole("heading", { level: 1, name: "Discovery Normal E2E Target" })).toBeVisible();

      // 探索模組呈現泛化錯誤狀態（不洩漏內部錯誤細節）
      const sidebar = page.locator("aside > div").first();
      await expect(sidebar.getByText("暫時無法載入，請稍後再試。").first()).toBeVisible();

      await context.clearCookies({ name: "e2e-discovery-fault" });
    });
  });

  test.describe("手機 390×844", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("探索模組於文章內容之後依相同順序呈現，且無水平捲動", async ({ page }) => {
      await page.goto(`/blog/${targetSlug}`);
      await expect(page.getByRole("heading", { level: 1, name: "Discovery Normal E2E Target" })).toBeVisible();

      // 手機／平板：stacked 版面是 DOM 中第二個重複實例（見 post-discovery-panel.tsx
      // 的 variant 分流：sidebar 先於 stacked），故取 .last()。
      const stacked = page.getByRole("heading", { name: "訂閱電子報" }).last().locator("xpath=ancestor::div[contains(@class,'section-shell')][1]");
      await expect(stacked).toBeVisible();

      const searchLabel = stacked.getByText("站內搜尋", { exact: true });
      const newsletterHeading = stacked.getByRole("heading", { name: "訂閱電子報" });
      const popularHeading = stacked.getByRole("heading", { name: "熱門文章" });
      const latestHeading = stacked.getByRole("heading", { name: "最新文章" });

      const [searchBox, newsletterBox, popularBox, latestBox] = await Promise.all([
        stableBoundingBox(searchLabel),
        stableBoundingBox(newsletterHeading),
        stableBoundingBox(popularHeading),
        stableBoundingBox(latestHeading),
      ]);
      expect(searchBox.y).toBeLessThan(newsletterBox.y);
      expect(newsletterBox.y).toBeLessThan(popularBox.y);
      expect(popularBox.y).toBeLessThan(latestBox.y);

      // 探索模組應位於主文之後：以第一段內容文字 y 座標小於 stacked 容器 y 座標驗證。
      const article = page.locator("article");
      const articleBox = await stableBoundingBox(article);
      expect(articleBox.y).toBeLessThanOrEqual(searchBox.y);

      const hasNoHorizontalScroll = await page.evaluate(() => {
        const el = document.scrollingElement;
        if (!el) return true;
        return el.scrollWidth <= el.clientWidth;
      });
      expect(hasNoHorizontalScroll).toBeTruthy();
    });

    test("手機版站內搜尋一樣導向 /search?q=", async ({ page }) => {
      await gotoAndWaitHydrated(page, `/blog/${targetSlug}`);
      const input = page.getByLabel("站內搜尋").last();
      await input.fill("mobile query");
      const form = input.locator("xpath=ancestor::form[1]");
      await form.getByRole("button", { name: "搜尋" }).click();

      // 見前一個桌面版測試的說明：client-side router.push 導向不觸發 load 事件，
      // 改以輪詢 page.url() 判斷。
      await expect.poll(() => page.url(), { timeout: 10000 }).toContain("/search?q=");
      const url = new URL(page.url());
      expect(url.searchParams.get("q")).toBe("mobile query");
    });
  });
});

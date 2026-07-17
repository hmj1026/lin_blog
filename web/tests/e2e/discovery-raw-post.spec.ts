import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";
import { gotoSettled } from "./helpers/streaming";

/**
 * E2E：原始 HTML（allowRawHtml=true）寬版文章的探索 grid
 *
 * 對應 openspec/changes/add-reader-discovery-and-subscriptions 任務 9.4。
 *
 * 涵蓋：
 * - iframe 維持寬版可用寬度（沿用 raw-html-wide-layout.spec.ts 的寬度契約：
 *   1903px 桌面 computed width >= 1871px）。
 * - 探索 grid 在 DOM 順序上位於 iframe 內容之後。
 * - grid responsive：桌面多欄、手機堆疊為單欄。
 * - iframe sandbox 屬性未被本變更更動。
 * - 既有 raw-html-wide-layout / raw-html-post 測試（ToC、preview 等）不退化，
 *   由 9.9 於同一次 `npx playwright test` 執行中一併涵蓋（見 report）。
 */

type Box = { x: number; y: number; width: number; height: number };

async function stableBoundingBox(locator: ReturnType<Page["locator"]>): Promise<Box> {
  let box: Box | null = null;
  await expect.poll(async () => (box = await locator.boundingBox()), { timeout: 15000 }).not.toBeNull();
  return box!;
}

const RAW_CONTENT = `<h2>探索 Grid 測試章節</h2>
<p>驗證探索模組不會限縮這段寬版內容的可用寬度。</p>`;

test.describe.configure({ mode: "serial" });

test.describe("discovery-raw-post", () => {
  let slug = "";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);

    const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    slug = `discovery-raw-e2e-${runId}`;

    // 姊妹文章：確保最新文章模組必定非空，讓 grid 內容斷言非 vacuous。
    const siblingSlug = `discovery-raw-e2e-sibling-${runId}`;
    const siblingRes = await page.request.post("/api/posts", {
      data: {
        slug: siblingSlug,
        title: "Discovery Raw E2E Sibling",
        excerpt: "discovery raw e2e 姊妹文章",
        content: "<p>姊妹文章內容。</p>",
        allowRawHtml: false,
        status: "PUBLISHED",
        categoryIds: [],
        tagIds: [],
      },
    });
    expect(siblingRes.ok(), `建立姊妹文章失敗：${siblingRes.status()}`).toBeTruthy();

    const res = await page.request.post("/api/posts", {
      data: {
        slug,
        title: "Discovery Raw E2E",
        excerpt: "discovery raw e2e 摘要",
        content: RAW_CONTENT,
        allowRawHtml: true,
        status: "PUBLISHED",
        categoryIds: [],
        tagIds: [],
      },
    });
    expect(res.ok(), `建立文章失敗：${res.status()}`).toBeTruthy();
    // 預熱路由：避免 dev server 首次命中新路由的即時編譯延後 hydration，
    // 造成後續測試第一個互動落在 hydration 完成前（見 discovery-normal-post.spec.ts）。
    await gotoSettled(page, `/blog/${slug}`);
    await context.close();
  });

  test.describe("桌面 1903px", () => {
    test.use({ viewport: { width: 1903, height: 1000 } });

    test("iframe 維持寬版可用寬度（computed width >= 1871px）", async ({ page }) => {
      await gotoSettled(page, `/blog/${slug}`);
      const frame = page.locator("iframe[title='post-content']");
      await frame.waitFor({ state: "attached", timeout: 15000 });
      const frameParent = frame.locator("..");
      const box = await stableBoundingBox(frameParent);
      expect(box.width).toBeGreaterThanOrEqual(1871);
    });

    test("iframe sandbox 屬性未被更動", async ({ page }) => {
      await gotoSettled(page, `/blog/${slug}`);
      const frame = page.locator("iframe[title='post-content']");
      await frame.waitFor({ state: "attached", timeout: 15000 });
      const sandbox = await frame.getAttribute("sandbox");
      expect(sandbox).not.toBeNull();
      // 不放寬既有 sandbox：不得含 allow-same-origin（沙盒逃逸風險）。
      expect(sandbox).not.toContain("allow-same-origin");
    });

    test("探索 grid 在 DOM 順序上位於 iframe 之後", async ({ page }) => {
      await gotoSettled(page, `/blog/${slug}`);
      const order = await page.evaluate(() => {
        const iframe = document.querySelector("iframe[title='post-content']");
        const newsletterHeading = Array.from(document.querySelectorAll("h3")).find(
          (h) => h.textContent === "訂閱電子報"
        );
        if (!iframe || !newsletterHeading) return null;
        const position = iframe.compareDocumentPosition(newsletterHeading);
        // Node.DOCUMENT_POSITION_FOLLOWING === 4
        return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      });
      expect(order).toBe(true);
    });

    test("探索 grid 桌面為多欄（md/xl 斷點生效，卡片非單欄堆疊）", async ({ page }) => {
      await gotoSettled(page, `/blog/${slug}`);
      const newsletterHeading = page.getByRole("heading", { name: "訂閱電子報" });
      const popularHeading = page.getByRole("heading", { name: "熱門文章" });
      await expect(newsletterHeading).toBeVisible();
      await expect(popularHeading).toBeVisible();

      // 比較卡片外層容器（而非標題本身）的位置：NewsletterForm 卡片標題上方多了
      // 一行「Newsletter」標籤，會讓標題文字本身的 y 略低於其他卡片標題，
      // 但卡片容器仍對齊同一個 grid row，比較容器才能反映實際的欄位排列。
      const newsletterCard = newsletterHeading.locator("xpath=ancestor::div[contains(@class,'rounded')][1]");
      const popularCard = popularHeading.locator("xpath=ancestor::div[contains(@class,'rounded')][1]");
      const [newsletterBox, popularBox] = await Promise.all([
        stableBoundingBox(newsletterCard),
        stableBoundingBox(popularCard),
      ]);
      // 多欄 grid：訂閱與熱門卡片並排在同一列，y 幾乎相同（同一 grid row），
      // 而非單欄堆疊時 popular 明顯低於 newsletter。
      expect(Math.abs(newsletterBox.y - popularBox.y)).toBeLessThanOrEqual(4);
      expect(popularBox.x).toBeGreaterThan(newsletterBox.x);
    });
  });

  test.describe("手機 375px", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("探索 grid 手機堆疊為單欄，無水平捲動", async ({ page }) => {
      await gotoSettled(page, `/blog/${slug}`);
      const frame = page.locator("iframe[title='post-content']");
      await frame.waitFor({ state: "attached", timeout: 15000 });

      const newsletterHeading = page.getByRole("heading", { name: "訂閱電子報" });
      const popularHeading = page.getByRole("heading", { name: "熱門文章" });
      await expect(newsletterHeading).toBeVisible();
      await expect(popularHeading).toBeVisible();

      const [newsletterBox, popularBox] = await Promise.all([
        stableBoundingBox(newsletterHeading),
        stableBoundingBox(popularHeading),
      ]);
      // 單欄堆疊：popular 在 newsletter 下方（y 更大），x 相近（同一欄）。
      expect(popularBox.y).toBeGreaterThan(newsletterBox.y);

      const hasNoHorizontalScroll = await page.evaluate(() => {
        const el = document.scrollingElement;
        if (!el) return true;
        return el.scrollWidth <= el.clientWidth;
      });
      expect(hasNoHorizontalScroll).toBeTruthy();
    });
  });
});

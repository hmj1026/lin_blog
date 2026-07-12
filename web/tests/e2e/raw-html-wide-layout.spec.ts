import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * E2E：原始 HTML 文章的寬版（viewport gutter）內容版面與 opt-in 系統目錄
 *
 * 對應 openspec/changes/improve-post-authoring-and-raw-html-layout 任務 5.3（撰寫）/ 6.2、6.3（執行）：
 * 這份 spec 在撰寫階段先不執行（write-only），將於 6.2/6.3 執行並修正整合問題。
 *
 * 涵蓋：
 * - 1903px 桌面：raw 內容外框（iframe 父容器）computed width >= 1871px、每側 gutter <= 16px、
 *   iframe 旁沒有固定 280px 側欄。
 * - 分享／標籤／探索模組在 DOM 中排在 iframe 之後（不在側欄）。
 * - hero、延伸閱讀區塊仍使用 section-shell（max-w-6xl）。
 * - 375px 行動版：外層文件無水平捲動（scrollWidth <= clientWidth），raw 外框不超過 layout viewport。
 * - 作者 inline `grid-template-columns: repeat(auto-fit, minmax(...))` 附件區塊在 iframe 內的欄數符合預期。
 * - 桌面／行動 raw 版面截圖，作為可審查的視覺基準。
 */

type Box = { x: number; y: number; width: number; height: number };

// 開發伺服器偶爾在首次導覽時觸發一次 fast-refresh 重新掛載，導致
// boundingBox() 讀到已被替換的節點而短暫回傳 null；用 poll 重試讓量測
// 落在版面穩定之後，而非放寬斷言本身。
async function stableBoundingBox(locator: ReturnType<Page["locator"]>): Promise<Box> {
  let box: Box | null = null;
  await expect.poll(async () => (box = await locator.boundingBox()), { timeout: 15000 }).not.toBeNull();
  return box!;
}

// 等待元素尺寸連續穩定（兩次讀值相同），用於 raw 內容 iframe 的 async auto-resize 落定之後再截圖，
// 避免視覺基準比對讀到 resize/字型載入中間態而 flaky。
async function waitForSettledSize(locator: ReturnType<Page["locator"]>): Promise<void> {
  let prev = "";
  await expect
    .poll(
      async () => {
        const box = await locator.boundingBox();
        const current = box ? `${Math.round(box.width)}x${Math.round(box.height)}` : "";
        const settled = current !== "" && current === prev;
        prev = current;
        return settled;
      },
      { timeout: 15000, intervals: [250, 250, 250] }
    )
    .toBe(true);
}

// 附件情境：兩個 H2（供系統目錄）+ 一個 auto-fit/minmax 網格附件區塊（3 欄，用來驗證寬版畫布
// 不再被 280px 側欄壓縮到提早換行）。
const RAW_CONTENT = `<h2>第一章</h2>
<p>第一章內容，說明寬版版面對長內容仍保持可讀寬度。</p>
<h2>附件網格</h2>
<div id="attachment-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 16px;">
  <div style="height: 80px; background: #eee;">卡片 1</div>
  <div style="height: 80px; background: #eee;">卡片 2</div>
  <div style="height: 80px; background: #eee;">卡片 3</div>
</div>`;

test.describe.configure({ mode: "serial" });

test.describe("raw-html-wide-layout", () => {
  let slug = "";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);

    const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    slug = `raw-html-wide-e2e-${runId}`;
    // 先建立一篇「同批」已發布的姊妹文章：listRelatedPublishedPosts 在無共用分類／標籤限制時
    // 仍會回傳其他已發布文章，確保「延伸閱讀」區塊在本 spec 執行環境下必定非空，
    // 讓 hero/related 皆使用 section-shell 的斷言不會因空清單而形同虛設（vacuous）。
    const siblingSlug = `raw-html-wide-e2e-sibling-${runId}`;
    const siblingRes = await page.request.post("/api/posts", {
      data: {
        slug: siblingSlug,
        title: "Raw HTML Wide Layout E2E Sibling",
        excerpt: "raw html 寬版布局 e2e 姊妹文章，供延伸閱讀斷言使用",
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
        title: "Raw HTML Wide Layout E2E",
        excerpt: "raw html 寬版布局 e2e 摘要",
        content: RAW_CONTENT,
        allowRawHtml: true,
        showRawHtmlToc: true,
        status: "PUBLISHED",
        categoryIds: [],
        tagIds: [],
      },
    });
    expect(res.ok(), `建立文章失敗：${res.status()}`).toBeTruthy();
    await context.close();
  });

  test.describe("桌面 1903px：寬版外框與無固定側欄", () => {
    test.use({ viewport: { width: 1903, height: 1000 } });

    test("iframe 父容器 computed width 至少 1871px，每側 gutter 不超過 16px", async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      const frame = page.locator("iframe[title='post-content']");
      await frame.waitFor({ state: "attached", timeout: 15000 });

      const frameParent = page.locator("iframe[title='post-content']").locator("..");
      const box = await stableBoundingBox(frameParent);

      expect(box.width).toBeGreaterThanOrEqual(1871);

      const leftGutter = box.x;
      const rightGutter = 1903 - (box.x + box.width);
      expect(leftGutter).toBeLessThanOrEqual(16);
      expect(rightGutter).toBeLessThanOrEqual(16);
    });

    test("iframe 旁沒有固定 280px 側欄", async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      const frame = page.locator("iframe[title='post-content']");
      await frame.waitFor({ state: "attached", timeout: 15000 });
      const frameBox = await stableBoundingBox(frame);

      // 分享／標籤模組不應與 iframe 並排在同一列（同一 y 範圍內出現在 iframe 右側 280px 附近）
      const shareHeading = page.getByRole("heading", { name: "分享此文" });
      await expect(shareHeading).toBeVisible();
      const shareBox = await stableBoundingBox(shareHeading);
      // 分享模組應該在 iframe 下方（y 值更大），而非右側同高並排
      expect(shareBox.y).toBeGreaterThanOrEqual(frameBox.y + frameBox.height - 1);
    });

    test("分享／標籤模組在 DOM 順序上排在 iframe 之後", async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      const order = await page.evaluate(() => {
        const iframe = document.querySelector("iframe[title='post-content']");
        const share = Array.from(document.querySelectorAll("h3")).find((h) => h.textContent === "分享此文");
        if (!iframe || !share) return null;
        const position = iframe.compareDocumentPosition(share);
        // Node.DOCUMENT_POSITION_FOLLOWING === 4：share 在 iframe 之後
        return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      });
      expect(order).toBe(true);
    });

    test("hero 與延伸閱讀區塊仍使用 section-shell", async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      // "header .section-shell" 同時命中全站導覽列（navbar-client.tsx 亦使用
      // section-shell）與文章 hero header，改以 article 內的 hero header 限定範圍。
      const header = page.locator("article header .section-shell");
      await expect(header).toHaveCount(1);

      // beforeAll 已建立姊妹文章確保「延伸閱讀」非空清單，此斷言必定執行（非 vacuous）
      const related = page.locator("section.section-shell", { hasText: "延伸閱讀" });
      await expect(related.first()).toBeVisible({ timeout: 15000 });
    });

    test("附件 auto-fit/minmax 網格在寬版畫布下維持 3 欄不提早換行", async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      const iframe = page.locator("iframe[title='post-content']");
      await iframe.waitFor({ state: "attached", timeout: 15000 });

      // iframe 的 sandbox 未開放 allow-same-origin，父頁依法不可直接讀取
      // contentDocument。每輪重新取得目前 iframe element 對應的 Frame，並在
      // 該 Frame 內一次完成查詢與量測；若 fast-refresh 正好替換 iframe，該輪
      // 回傳空陣列，交由 poll 重新解析目前的 iframe，避免保留 detached locator。
      let cardTops: number[] = [];
      await expect
        .poll(
          async () => {
            try {
              const element = await iframe.elementHandle();
              const frame = await element?.contentFrame();
              cardTops = frame
                ? await frame.evaluate(() =>
                    Array.from(document.querySelectorAll("#attachment-grid > div"), (card) =>
                      card.getBoundingClientRect().top
                    )
                  )
                : [];
            } catch {
              cardTops = [];
            }
            return cardTops.length;
          },
          { timeout: 15000 }
        )
        .toBeGreaterThan(0);
      // 3 欄同一列：所有卡片 top 應相同（允許 1px 誤差），代表沒有因寬度不足而換行
      const [first, ...rest] = cardTops;
      for (const top of rest) {
        expect(Math.abs(top - first)).toBeLessThanOrEqual(1);
      }
    });
  });

  test.describe("行動 375px：無水平捲動", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("外層文件 scrollWidth <= clientWidth，raw 外框不超過 layout viewport", async ({ page }) => {
      await page.goto(`/blog/${slug}`);
      const frame = page.locator("iframe[title='post-content']");
      await frame.waitFor({ state: "attached", timeout: 15000 });

      const hasNoHorizontalScroll = await page.evaluate(() => {
        const el = document.scrollingElement;
        if (!el) return true;
        return el.scrollWidth <= el.clientWidth;
      });
      expect(hasNoHorizontalScroll).toBeTruthy();

      const frameParent = page.locator("iframe[title='post-content']").locator("..");
      const box = await stableBoundingBox(frameParent);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    });
  });

  test.describe("視覺基準", () => {
    // 視覺基準必須是穩定斷言，不允許以全域 retry 掩蓋 flaky pass；此區塊關閉 retry。
    test.describe.configure({ retries: 0 });

    test("桌面（1903px）：raw 結構渲染、版面寬滿，並比對視覺基準截圖", async ({ page }) => {
      await page.setViewportSize({ width: 1903, height: 1000 });
      await page.goto(`/blog/${slug}`);
      const iframe = page.locator("iframe[title='post-content']");
      await iframe.waitFor({ state: "attached", timeout: 15000 });

      // raw 結構在 iframe 內確實渲染（heading 與作者 auto-fit grid 都保留，未被 strict sanitizer 剝除）
      const frame = page.frameLocator("iframe[title='post-content']");
      await expect(frame.locator("h2", { hasText: "第一章" })).toBeVisible();
      await expect(frame.locator("#attachment-grid")).toBeVisible();

      // iframe 內容外框填滿寬版畫布（未被 280px 側欄壓縮）
      const box = await stableBoundingBox(iframe);
      expect(box.width).toBeGreaterThanOrEqual(1871);

      // 視覺基準：只截取 raw 內容 iframe（內容固定為 RAW_CONTENT），避免把每次執行都變動的
      // 「延伸閱讀」清單納入 baseline。iframe 的 async auto-resize 高度會在 ±2px 抖動，
      // 而 Playwright 對「尺寸不符」是硬性失敗（容差不適用），故以固定尺寸 clip 鎖定截圖範圍，
      // 讓高度抖動不影響影像尺寸；再以放寬的像素容差吸收寬畫布的字型次像素漂移。
      await page.evaluate(() => document.fonts.ready);
      await waitForSettledSize(iframe);
      await expect(page).toHaveScreenshot("raw-html-wide-desktop-1903.png", {
        clip: { x: Math.round(box.x), y: Math.round(box.y), width: 1871, height: 560 },
        maxDiffPixelRatio: 0.05,
      });
    });

    test("行動（375px）：raw 結構渲染、無水平捲動，並比對視覺基準截圖", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto(`/blog/${slug}`);
      const iframe = page.locator("iframe[title='post-content']");
      await iframe.waitFor({ state: "attached", timeout: 15000 });

      const frame = page.frameLocator("iframe[title='post-content']");
      await expect(frame.locator("h2", { hasText: "第一章" })).toBeVisible();

      const hasNoHorizontalScroll = await page.evaluate(() => {
        const el = document.scrollingElement;
        if (!el) return true;
        return el.scrollWidth <= el.clientWidth;
      });
      expect(hasNoHorizontalScroll).toBeTruthy();

      // 行動版 iframe 位於首屏之下且高度不抖動（實測穩定），用 element 截圖（會自動捲入視窗），
      // 不套用桌面的 viewport clip（其 y 在首屏之下，clip 會落在截圖範圍外）。
      await page.evaluate(() => document.fonts.ready);
      await waitForSettledSize(iframe);
      await expect(iframe).toHaveScreenshot("raw-html-wide-mobile-375.png", {
        maxDiffPixelRatio: 0.02,
      });
    });
  });
});

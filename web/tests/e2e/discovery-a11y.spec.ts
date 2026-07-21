import { test, expect, type Page, type Locator } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAsAdmin } from "./helpers/auth";
import { loadDatabaseUrl } from "./helpers/db";
import { gotoSettled } from "./helpers/streaming";

/**
 * E2E：探索模組／Newsletter／後台名單的鍵盤與無障礙檢查
 *
 * 對應 openspec/changes/add-reader-discovery-and-subscriptions 任務 9.7。
 *
 * 專案未安裝 axe-core 或等價工具（依任務限制不得新增 npm 依賴），因此本檔案採
 * 手動組裝的鍵盤流程與 DOM/ARIA 斷言，而非自動化 a11y 掃描；涵蓋範圍：
 * - 搜尋表單 → Newsletter 表單的 Tab 順序與可見焦點樣式。
 * - label 透過 `getByLabel` 可程式化取得（等同有正確 `for`/`aria-label` 關聯）。
 * - Newsletter 狀態訊息具備 `aria-live`。
 * - CAPTCHA 測試替身重設後鍵盤焦點不會被困住（可繼續 Tab 離開表單）。
 * - 後台訂閱者名單可純鍵盤操作（搜尋輸入、Enter 送出、分頁按鈕可聚焦）。
 *
 * 本檔案只讀取/聚焦表單，不送出 Newsletter 訂閱請求，因此不消耗
 * newsletter 專用限流額度（不影響 newsletter-subscribe.spec.ts 的預算假設）。
 */

/**
 * 導向頁面並等待 client-side hydration 相關控制項啟用再互動。`networkidle`
 * 只代表網路請求暫時清空，不代表 React 已完成 hydration；一律以實際受
 * hydration gate 控制的欄位 `toBeEnabled()` 等待，避免 `.focus()` 落到
 * disabled 的 SSR DOM。後台搜尋框在 SSR 階段本來就 enabled，因此改等待
 * client fetch 完成後才會渲染的分頁摘要。
 */
async function gotoAndWaitHydrated(page: Page, path: string) {
  await gotoSettled(page, path);
  if (path.startsWith("/blog/")) {
    for (const label of ["站內搜尋", "姓名", "Email"]) {
      await expect(page.getByLabel(label)).toBeEnabled();
    }
  } else if (path.startsWith("/admin/subscribers")) {
    await expect(page.getByText(/共 \d+ 位訂閱者/)).toBeVisible({ timeout: 15000 });
  }
}

/** 聚焦時是否具備可見焦點樣式（outline 或 box-shadow/ring，Tailwind `focus:ring` 走 box-shadow）。 */
async function hasVisibleFocusStyle(locator: Locator): Promise<boolean> {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    const hasOutline = style.outlineStyle !== "none" && style.outlineWidth !== "0px";
    const hasBoxShadow = style.boxShadow !== "none" && style.boxShadow !== "";
    const hasRingBorder = style.borderColor !== "" && style.borderStyle !== "none";
    return hasOutline || hasBoxShadow || hasRingBorder;
  });
}

test.describe.configure({ mode: "serial" });

test.describe("discovery-a11y", () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const slug = `discovery-a11y-e2e-${runId}`;
  const prisma = new PrismaClient({ datasourceUrl: loadDatabaseUrl() });
  const subscriberA = {
    name: `E2E A11y Subscriber A ${runId}`,
    email: `e2e-a11y-subscriber-a-${runId}@example.com`,
  };
  const subscriberB = {
    name: `E2E A11y Subscriber B ${runId}`,
    email: `e2e-a11y-subscriber-b-${runId}@example.com`,
  };
  const seededSubscriberEmails: string[] = [subscriberA.email, subscriberB.email];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);

    const res = await page.request.post("/api/posts", {
      data: {
        slug,
        title: "Discovery A11y E2E",
        excerpt: "discovery a11y e2e 摘要",
        content: "<p>a11y 測試宿主內容。</p>",
        allowRawHtml: true,
        status: "PUBLISHED",
        categoryIds: [],
        tagIds: [],
      },
    });
    expect(res.ok(), `建立宿主文章失敗：${res.status()}`).toBeTruthy();
    for (const { name, email } of [subscriberA, subscriberB]) {
      await prisma.subscriber.create({ data: { name, email } });
    }
    // 預熱路由：避免 dev server 首次命中新路由的即時編譯延後 hydration，
    // 造成第一個鍵盤互動落在 React 接手事件之前（見 discovery-normal-post.spec.ts）。
    await gotoAndWaitHydrated(page, `/blog/${slug}`);
    await context.close();
  });

  test.afterAll(async () => {
    await prisma.subscriber.deleteMany({ where: { email: { in: seededSubscriberEmails } } });
    await prisma.$disconnect();
  });

  test("搜尋輸入 label 可透過 getByLabel 取得（可程式化關聯）", async ({ page }) => {
    await gotoAndWaitHydrated(page, `/blog/${slug}`);
    await expect(page.getByLabel("站內搜尋")).toBeVisible();
    await expect(page.getByLabel("姓名")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("/search 結果頁：搜尋輸入具備 visible label，可鍵盤聚焦並以 Enter 重新搜尋", async ({ page }) => {
    await gotoSettled(page, "/search?q=a11y");
    // visible label（非僅 placeholder），且可程式化關聯
    const label = page.getByText("搜尋關鍵字", { exact: true });
    await expect(label).toBeVisible();
    const input = page.getByLabel("搜尋關鍵字");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("a11y");

    // 鍵盤操作：聚焦（具可見焦點樣式）→ 改寫查詢 → Enter 送出導向新結果
    await expect(input).toBeEnabled();
    await input.focus();
    await expect(input).toBeFocused();
    expect(await hasVisibleFocusStyle(input)).toBe(true);
    await input.fill("keyboard query");
    await page.keyboard.press("Enter");

    await page.waitForURL("**/search?q=keyboard+query**");
    await expect(page.getByLabel("搜尋關鍵字")).toHaveValue("keyboard query");
  });

  test("/search 結果頁：含 % 的查詢不會 500，頁面正常渲染", async ({ page }) => {
    // 迴歸防護：searchParams 已由框架解碼，頁面不得再次 decodeURIComponent
    const res = await page.goto("/search?q=100%25");
    expect(res?.status()).toBe(200);
    await expect(page.getByLabel("搜尋關鍵字")).toHaveValue("100%");

    // 不完整 percent-encoding、中文與 + 的變體同樣不得 500
    const malformed = await page.goto("/search?q=50%2");
    expect(malformed?.status()).toBe(200);
    const cjk = await page.goto(`/search?q=${encodeURIComponent("中文 查詢+plus")}`);
    expect(cjk?.status()).toBe(200);
    await expect(page.getByLabel("搜尋關鍵字")).toHaveValue("中文 查詢+plus");
  });

  test("鍵盤 Tab 順序：搜尋輸入 → 搜尋按鈕 → 姓名 → Email，且每一步具備可見焦點樣式", async ({ page }) => {
    await gotoAndWaitHydrated(page, `/blog/${slug}`);

    const searchInput = page.getByLabel("站內搜尋");
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
    expect(await hasVisibleFocusStyle(searchInput)).toBe(true);

    await page.keyboard.press("Tab");
    // 導覽列另有一個 aria-label="搜尋" 的按鈕，故限定在站內搜尋所屬的 <form> 內查找，
    // 避免 getByRole 在全頁範圍內解析到兩個同名按鈕。
    const searchForm = searchInput.locator("xpath=ancestor::form[1]");
    const searchButton = searchForm.getByRole("button", { name: "搜尋" });
    await expect(searchButton).toBeFocused();
    expect(await hasVisibleFocusStyle(searchButton)).toBe(true);

    await page.keyboard.press("Tab");
    const nameInput = page.getByLabel("姓名");
    await expect(nameInput).toBeFocused();
    expect(await hasVisibleFocusStyle(nameInput)).toBe(true);

    await page.keyboard.press("Tab");
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeFocused();
    expect(await hasVisibleFocusStyle(emailInput)).toBe(true);
  });

  test("Newsletter 狀態訊息具備 aria-live", async ({ page }) => {
    await gotoAndWaitHydrated(page, `/blog/${slug}`);
    await expect(page.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  test("驗證錯誤後焦點移至第一個無效欄位（可存取名稱可辨識）", async ({ page }) => {
    await gotoAndWaitHydrated(page, `/blog/${slug}`);
    await page.getByRole("button", { name: /訂閱/ }).click();
    await expect(page.getByLabel("姓名")).toBeFocused();
  });

  test("CAPTCHA 測試替身重設後鍵盤焦點不受困，仍可 Tab 離開表單", async ({ page }) => {
    await gotoAndWaitHydrated(page, `/blog/${slug}`);
    await page.getByLabel("姓名").fill("A11y Reader");
    await page.getByLabel("Email").fill(`e2e-a11y-${runId}@example.com`);
    await page.getByTestId("recaptcha-stub-token-e2e-expired").click();
    const resetButton = page.getByTestId("recaptcha-stub-reset");
    await expect(resetButton).toBeEnabled();
    await resetButton.focus();
    await expect(resetButton).toBeFocused();

    // 從重設按鈕繼續 Tab，焦點應能持續前進（不被困在同一個節點），
    // 最終可離開 Newsletter 表單卡片。
    let escaped = false;
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press("Tab");
      const stillInsideStub = await page
        .getByTestId("recaptcha-stub-reset")
        .evaluate((el) => el === document.activeElement);
      if (!stillInsideStub) {
        escaped = true;
        break;
      }
    }
    expect(escaped).toBe(true);
  });

  test("後台訂閱者名單：搜尋輸入可用鍵盤聚焦與 Enter 送出，分頁按鈕可聚焦", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoAndWaitHydrated(page, "/admin/subscribers?pageSize=1");

    const searchInput = page.getByLabel("搜尋姓名或 Email");
    await expect(searchInput).toBeEnabled();
    await searchInput.focus();
    await expect(searchInput).toBeFocused();
    await page.keyboard.type("nonexistent-search-term-for-a11y-check");
    await page.keyboard.press("Enter");
    await expect(page.getByText("找不到符合的訂閱者")).toBeVisible({ timeout: 15000 });

    await searchInput.fill("");
    await page.keyboard.press("Enter");

    // 本 spec 在 beforeAll 自行種入 2 筆訂閱者並強制使用 `?pageSize=1`，
    // 因此保證 totalPages >= 2，下一頁一定存在，並驗證其可用鍵盤聚焦且具可見樣式。
    const prevControl = page.getByText("上一頁", { exact: true });
    await expect(prevControl).toBeVisible();
    expect(await prevControl.evaluate((element) => element.tagName)).toBe("SPAN");

    const nextLink = page.getByRole("link", { name: "下一頁" });
    await expect(nextLink).toBeVisible();
    await nextLink.focus();
    await expect(nextLink).toBeFocused();
    expect(await hasVisibleFocusStyle(nextLink)).toBe(true);
  });
});

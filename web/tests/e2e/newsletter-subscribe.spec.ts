import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * E2E：Newsletter 訂閱表單（使用可控 CAPTCHA 測試替身）
 *
 * 對應 openspec/changes/add-reader-discovery-and-subscriptions 任務 9.5。
 *
 * 測試替身閘控（見 playwright.config.ts webServer.env）：
 * - `NEWSLETTER_CAPTCHA_TEST_DOUBLE=1` + 非 production NODE_ENV → 伺服器使用確定性假
 *   verifier（`src/modules/newsletter/infrastructure/captcha/test-double.ts`）。
 * - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=e2e-test` → 前端渲染
 *   `RecaptchaTestDoubleWidget`（`src/components/newsletter/recaptcha-test-double-widget.tsx`）
 *   而非載入 Google 的 `recaptcha/api.js`。
 *
 * 這份 spec 使用一篇 raw HTML 文章作為宿主頁面：raw 版面的探索 grid
 * （`PostDiscoveryPanel variant="grid"`）只掛載一個 `NewsletterForm` 實例，
 * 避免一般文章 sidebar/stacked 雙實例造成的 label/aria-live 二義性。
 *
 * Rate limit（design.md D4，預設每來源雜湊 10 分鐘 5 次）是 **process-local**
 * 且以本檔案所有測試共用同一個 sourceKey（本地測試請求不帶
 * `x-forwarded-for`/`x-real-ip`，`getClientIp` 一律回退為 `"unknown"`）。因此
 * 本檔案：
 * - 用 `test.describe.configure({ mode: "serial" })` 固定執行順序；
 * - 有意識地控制每個功能測試實際呼叫 API 的次數，讓限流測試前僅消耗
 *   5 次以內的額度；
 * - 限流測試本身依任務說明採「容忍先前測試已消耗額度」的寫法：連續送出
 *   最多 6 次、只要出現至少一次 429 + 等待訊息即視為通過，不寫死是第幾次。
 * - 若此檔案在同一個 dev server process 存活期間（10 分鐘內）被重複執行
 *   （例如手動重跑除錯），前面的功能測試可能因額度已耗盡而意外收到 429；
 *   這是 process-local rate limiter 的已知限制，重跑前建議重啟 dev server。
 */

function uniqueEmail(tag: string, runId: string) {
  return `e2e-newsletter-${tag}-${runId}@example.com`;
}

test.describe.configure({ mode: "serial" });

test.describe("newsletter-subscribe", () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const slug = `newsletter-e2e-host-${runId}`;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);

    const res = await page.request.post("/api/posts", {
      data: {
        slug,
        title: "Newsletter E2E Host",
        excerpt: "newsletter e2e 宿主文章",
        content: "<p>宿主文章內容，用於掛載探索 grid 的 Newsletter 表單。</p>",
        allowRawHtml: true,
        status: "PUBLISHED",
        categoryIds: [],
        tagIds: [],
      },
    });
    expect(res.ok(), `建立宿主文章失敗：${res.status()}`).toBeTruthy();
    // 預熱路由：避免 dev server 首次命中新路由的即時編譯延後 hydration，
    // 造成第一個測試的表單互動落在 React 接手 onChange 之前
    // （見 discovery-normal-post.spec.ts 的說明）。
    await page.goto(`/blog/${slug}`);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(`/blog/${slug}`);
    await expect(page.getByTestId("recaptcha-stub")).toBeVisible();
    // 等待 client-side hydration 完成再互動：姓名/Email 為 React controlled
    // input，若在 hydration 完成前用 fill() 寫入 DOM，之後才附掛的 onChange
    // 永遠不會把值同步進 React state，導致送出時誤判為空白輸入
    // （純測試時機問題，非應用程式邏輯錯誤——見 discovery-normal-post.spec.ts
    // 的 gotoAndWaitHydrated 說明）。
    await page.waitForLoadState("networkidle");
  });

  test("labels 為可見且與輸入欄位程式化關聯", async ({ page }) => {
    await expect(page.getByLabel("姓名")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("欄位驗證錯誤：空白姓名/不合法 Email 時顯示錯誤並將焦點移至第一個無效欄位，不送出請求", async ({ page }) => {
    await page.getByRole("button", { name: /訂閱/ }).click();
    await expect(page.getByText("姓名為必填欄位")).toBeVisible();
    await expect(page.getByLabel("姓名")).toBeFocused();

    await page.getByLabel("姓名").fill("Reader");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByRole("button", { name: /訂閱/ }).click();
    await expect(page.getByText("Email 格式不正確")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeFocused();
  });

  test("過期 token 恢復：選擇 e2e-expired 顯示泛化錯誤並保留輸入，重新選擇 e2e-pass 後成功", async ({ page }) => {
    const email = uniqueEmail("expired-recovery", runId);
    await page.getByLabel("姓名").fill("Expired Recovery");
    await page.getByLabel("Email").fill(email);
    await page.getByTestId("recaptcha-stub-token-e2e-expired").click();
    await page.getByRole("button", { name: /訂閱/ }).click();

    const status = page.getByRole("status");
    // 本測試是此 serial 檔案第一個實際命中 /api/newsletter/subscribe 的
    // （前兩個測試皆被 client-side 驗證擋下不送出）；dev server 首次命中
    // API route 的冷編譯可能讓回應超過預設 5s expect 預算，status 會停在
    // 「訂閱送出中」過渡態，放寬首次命中的等待預算
    await expect(status).toHaveText(/稍後再試/, { timeout: 15000 });
    await expect(page.getByLabel("姓名")).toHaveValue("Expired Recovery");
    await expect(page.getByLabel("Email")).toHaveValue(email);

    await page.getByTestId("recaptcha-stub-token-e2e-pass").click();
    await page.getByRole("button", { name: /訂閱/ }).click();
    await expect(status).toHaveText(/感謝訂閱/);
  });

  test("成功訂閱：填寫姓名/Email、通過 CAPTCHA 後顯示泛化成功訊息（aria-live）", async ({ page }) => {
    const email = uniqueEmail("happy-path", runId);
    await page.getByLabel("姓名").fill("Happy Path");
    await page.getByLabel("Email").fill(email);
    await page.getByTestId("recaptcha-stub-token-e2e-pass").click();

    const status = page.getByRole("status");
    await expect(status).toHaveAttribute("aria-live", "polite");
    await page.getByRole("button", { name: /訂閱/ }).click();
    await expect(status).toHaveText(/感謝訂閱/);
  });

  test("重複訂閱：相同 Email 再次送出，回傳與首次成功相同的泛化訊息", async ({ page }) => {
    const email = uniqueEmail("happy-path", runId); // 沿用上一測試已建立的 Email
    await page.getByLabel("姓名").fill("Happy Path Again");
    await page.getByLabel("Email").fill(email);
    await page.getByTestId("recaptcha-stub-token-e2e-pass").click();
    await page.getByRole("button", { name: /訂閱/ }).click();

    await expect(page.getByRole("status")).toHaveText(/感謝訂閱/);
  });

  test("provider 失敗：e2e-provider-error 顯示可恢復的泛化錯誤，且不顯示成功訊息", async ({ page }) => {
    const email = uniqueEmail("provider-error", runId);
    await page.getByLabel("姓名").fill("Provider Error");
    await page.getByLabel("Email").fill(email);
    await page.getByTestId("recaptcha-stub-token-e2e-provider-error").click();
    await page.getByRole("button", { name: /訂閱/ }).click();

    const status = page.getByRole("status");
    await expect(status).toHaveText(/稍後再試/);
    await expect(status).not.toHaveText(/感謝訂閱/);
  });

  test("限流：短時間內以不同 Email 連續送出，最終出現 429 與可見的等待訊息", async ({ page }) => {
    const status = page.getByRole("status");
    let sawRateLimited = false;

    for (let attempt = 1; attempt <= 6 && !sawRateLimited; attempt += 1) {
      const email = uniqueEmail(`rate-limit-${attempt}`, runId);
      await page.getByLabel("姓名").fill(`Rate Limit ${attempt}`);
      await page.getByLabel("Email").fill(email);
      await page.getByTestId("recaptcha-stub-token-e2e-pass").click();
      await page.getByRole("button", { name: /訂閱/ }).click();

      // 等待狀態離開「送出中」的過渡文字，避免讀到 submitting 中間態而非最終結果
      // （e2e-runner trap sheet：先讓非同步狀態落定再量測）。
      await expect(status).not.toHaveText(/送出中/, { timeout: 10000 });
      await expect(status).not.toHaveText("", { timeout: 10000 });
      const text = (await status.textContent()) ?? "";
      if (/請求過於頻繁/.test(text)) {
        sawRateLimited = true;
      }
    }

    expect(
      sawRateLimited,
      "預期在 6 次以內的送出中至少出現一次限流回應（前面測試可能已消耗部分額度，見檔頭說明）"
    ).toBe(true);
  });
});

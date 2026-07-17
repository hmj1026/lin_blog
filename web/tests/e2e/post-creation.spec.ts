import { test, expect } from "@playwright/test";
import { E2E_ADMIN_EMAIL, loginAsAdmin } from "./helpers/auth";
import { gotoSettled } from "./helpers/streaming";

test.describe("Blog Frontend", () => {
  test("首頁可正常載入", async ({ page }) => {
    await gotoSettled(page, "/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("文章列表頁可正常載入", async ({ page }) => {
    await gotoSettled(page, "/blog");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("搜尋頁可正常載入", async ({ page }) => {
    await gotoSettled(page, "/search");
    await expect(page.locator("input[name='q']")).toBeVisible();
  });

  test("搜尋功能可輸入關鍵字", async ({ page }) => {
    await gotoSettled(page, "/search");
    const searchInput = page.locator("input[name='q']");
    // /search 是 force-dynamic 的 server component（input 為 uncontrolled，
    // 不受 hydration 影響）；放寬可見等待以容忍 dev server 冷編譯超過
    // 預設 5s expect 預算。
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.fill("測試文章");
    // 用條件式等待（auto-retry）取代固定 waitForTimeout：在並行執行、
    // dev server 負載較高時，固定時間的等待可能在值尚未穩定前就讀取，
    // 造成間歇性失敗。
    await expect(searchInput).toHaveValue(/測試/);
  });
});

test.describe("Admin Panel - 未登入", () => {
  test("未登入時重導向至登入頁", async ({ page }) => {
    await gotoSettled(page, "/admin");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("登入頁可正常載入", async ({ page }) => {
    await gotoSettled(page, "/login");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("輸入錯誤密碼顯示錯誤訊息", async ({ page }) => {
    await gotoSettled(page, "/login");
    await page.fill("input[type='email'], input[name='email']", E2E_ADMIN_EMAIL);
    await page.fill("input[type='password']", "wrongpassword");
    await page.click("button[type='submit']");

    // 等待實際渲染的錯誤訊息（web/src/app/login/page.tsx），而非固定等待後
    // 才檢查是否仍留在登入頁。
    await expect(page.getByText("帳號或密碼錯誤")).toBeVisible();
    expect(page.url()).toContain("/login");
  });
});

test.describe("Admin Panel - 登入流程", () => {
  test("使用正確帳密可登入", async ({ page }) => {
    await loginAsAdmin(page);
    expect(page.url()).toContain("/admin");
  });
});

test.describe("Media Upload - 頁面載入", () => {
  test("媒體頁需要登入", async ({ page }) => {
    await gotoSettled(page, "/admin/media");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });
});

test.describe("SEO 與 Meta", () => {
  test("首頁有正確的 title", async ({ page }) => {
    await gotoSettled(page, "/");
    await expect(page).toHaveTitle(/Lin Blog|部落格/);
  });

  test("首頁有 meta description", async ({ page }) => {
    await gotoSettled(page, "/");
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
  });
});

test.describe("響應式設計", () => {
  test("手機版首頁可正常載入", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await gotoSettled(page, "/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("平板版首頁可正常載入", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await gotoSettled(page, "/");
    await expect(page.locator("h1")).toBeVisible();
  });
});

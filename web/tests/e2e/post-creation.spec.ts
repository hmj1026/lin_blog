import { test, expect } from "@playwright/test";

/**
 * E2E 測試帳號設定
 * 可透過環境變數 E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD 覆蓋預設值
 */
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin123";

test.describe("Blog Frontend", () => {
  test("首頁可正常載入", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("文章列表頁可正常載入", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("搜尋頁可正常載入", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator("input[type='search'], input[type='text']")).toBeVisible();
  });

  test("搜尋功能可輸入關鍵字", async ({ page }) => {
    await page.goto("/search");
    const searchInput = page.locator("input[type='search'], input[type='text']").first();
    await searchInput.fill("測試文章");
    await expect(searchInput).toHaveValue("測試文章");
  });
});

test.describe("Admin Panel - 未登入", () => {
  test("未登入時重導向至登入頁", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("登入頁可正常載入", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });

  test("輸入錯誤密碼顯示錯誤訊息", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email'], input[name='email']", E2E_ADMIN_EMAIL);
    await page.fill("input[type='password']", "wrongpassword");
    await page.click("button[type='submit']");

    // 等待錯誤訊息或保持在登入頁
    await page.waitForTimeout(1000);
    expect(page.url()).toContain("/login");
  });
});

test.describe("Admin Panel - 登入流程", () => {
  test("使用正確帳密可登入", async ({ page }) => {
    await page.goto("/login");
    await page.fill("input[type='email'], input[name='email']", E2E_ADMIN_EMAIL);
    await page.fill("input[type='password']", E2E_ADMIN_PASSWORD);
    await page.click("button[type='submit']");

    // 等待重導向到 admin
    await page.waitForURL("**/admin**", { timeout: 10000 });
    expect(page.url()).toContain("/admin");
  });
});

test.describe("Media Upload - 頁面載入", () => {
  test("媒體頁需要登入", async ({ page }) => {
    await page.goto("/admin/media");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });
});

test.describe("SEO 與 Meta", () => {
  test("首頁有正確的 title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Lin Blog|部落格/);
  });

  test("首頁有 meta description", async ({ page }) => {
    await page.goto("/");
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
  });
});

test.describe("響應式設計", () => {
  test("手機版首頁可正常載入", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("平板版首頁可正常載入", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });
});

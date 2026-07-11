import { test, expect } from "@playwright/test";

test.describe("文章詳細頁", () => {
  test("從文章列表進入文章詳細頁並正確顯示內容", async ({ page }) => {
    // 前往文章列表頁
    await page.goto("/blog");
    await expect(page.locator("h1")).toBeVisible();

    // 點擊第一篇文章
    const firstArticleLink = page.locator("a[href^='/blog/']").first();
    await expect(firstArticleLink).toBeVisible();
    await firstArticleLink.click();

    // 等待文章詳細頁載入
    await page.waitForURL("**/blog/**");

    // 驗證文章內容顯示
    await expect(page.locator("h1")).toBeVisible(); // 標題
    await expect(page.locator("article, .prose, [class*='content']")).toBeVisible(); // 內容區域
  });

  test("文章詳細頁顯示分類和標籤", async ({ page }) => {
    await page.goto("/blog");
    const firstArticleLink = page.locator("a[href^='/blog/']").first();
    await firstArticleLink.click();
    await page.waitForURL("**/blog/**");

    // 驗證分類或標籤可見（至少有一個）
    const categoryOrTag = page.locator("a[href^='/category/'], a[href^='/tag/']").first();
    await expect(categoryOrTag).toBeVisible();
  });

  test("文章詳細頁有正確的 SEO meta tags", async ({ page }) => {
    await page.goto("/blog");
    const firstArticleLink = page.locator("a[href^='/blog/']").first();
    const href = await firstArticleLink.getAttribute("href");
    // 直接導覽到文章頁以取得伺服器渲染的 <head>；client-side soft navigation 在
    // dev 模式下可能暫時殘留前一頁的 meta 標籤（非產品缺陷，伺服器 HTML 僅一個 description）。
    await page.goto(href ?? "/blog");
    await page.waitForURL("**/blog/**");

    // 驗證 title
    await expect(page).toHaveTitle(/.+/);

    // 驗證 meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveCount(1);
  });
});

test.describe("分類頁", () => {
  test("分類頁可正常載入並顯示文章", async ({ page }) => {
    await page.goto("/category/策略");
    
    // 驗證頁面載入
    await expect(page.locator("h1")).toBeVisible();
    
    // 驗證至少有一篇文章或顯示空狀態
    const hasArticles = await page.locator("a[href^='/blog/']").count() > 0;
    const hasEmptyState = await page.locator("text=/暫無文章|找不到|沒有文章/").isVisible().catch(() => false);
    
    expect(hasArticles || hasEmptyState).toBeTruthy();
  });

  test("分類頁顯示正確的分類名稱", async ({ page }) => {
    await page.goto("/category/策略");
    
    // 驗證分類名稱顯示在頁面標題或內容中
    const hasTitle = await page.locator("h1").textContent();
    expect(hasTitle).toContain("策略");
  });
});

test.describe("標籤頁", () => {
  test("標籤頁可正常載入並顯示文章", async ({ page }) => {
    // 先從首頁找一個標籤連結
    await page.goto("/");
    
    const tagLink = page.locator("a[href^='/tag/']").first();
    const isTagVisible = await tagLink.isVisible().catch(() => false);
    
    if (isTagVisible) {
      await tagLink.click();
      await page.waitForURL("**/tag/**");
      
      // 驗證頁面載入
      await expect(page.locator("h1")).toBeVisible();
      
      // 驗證至少有一篇文章或顯示空狀態
      const hasArticles = await page.locator("a[href^='/blog/']").count() > 0;
      const hasEmptyState = await page.locator("text=/暫無文章|找不到|沒有文章/").isVisible().catch(() => false);
      
      expect(hasArticles || hasEmptyState).toBeTruthy();
    } else {
      // 如果首頁沒有標籤，直接訪問一個標籤頁
      await page.goto("/tag/設計");
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});

test.describe("登出流程", () => {
  test("登入後可以登出並重導向", async ({ page }) => {
    // 先登入
    await page.goto("/login");
    await page.fill("input[type='email'], input[name='email']", "admin@lin.blog");
    await page.fill("input[type='password']", "admin");
    await page.click("button[type='submit']");
    
    // 等待重導向到 admin
    await page.waitForURL("**/admin**", { timeout: 10000 });
    
    // sidebar 載入後尋找登出連結（/logout?callbackUrl=/login）
    const logoutLink = page.locator("aside a[href*='logout']").first();
    await expect(logoutLink).toBeVisible();
    await logoutLink.click();

    // 等待重導向到登入頁
    await page.waitForURL("**/login**", { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });
});

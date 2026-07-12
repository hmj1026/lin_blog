import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

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
    // 此測試的重點是分類/標籤的呈現，不是導覽本身：
    // 直接以 href 進入文章頁，避免 client-side soft navigation 的時序干擾
    // （同下方 SEO meta 測試的既有 pattern）。
    await page.goto("/blog");
    const firstArticleLink = page.locator("a[href^='/blog/']").first();
    const href = await firstArticleLink.getAttribute("href");
    await page.goto(href ?? "/blog");
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

test.describe("Hydration 保留 SSR DOM", () => {
  test("首頁 hydration 後保留 SSR 渲染的 DOM 節點（不整棵 client 重建）", async ({ page }) => {
    // 回歸鎖定：ThemeProvider 曾以 mounted 條件在 Fragment 與 Provider 間切換，
    // 使 hydration 後整個 body 以下被卸載重建（SSR 成果全丟、iframe 重載，
    // E2E 互動跨越該時窗會間歇性失敗）。此測試在 DOMContentLoaded 時抓住
    // SSR 的 <main> 節點，hydration 完成後斷言同一節點仍在文件中。
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { __ssrMain?: Element | null }).__ssrMain =
          document.querySelector("main");
      });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const kept = await page.evaluate(() => {
      const w = window as unknown as { __ssrMain?: Element | null };
      return w.__ssrMain ? w.__ssrMain.isConnected : "missing";
    });
    expect(kept).toBe(true);
  });
});

test.describe("首頁 Header 搜尋欄", () => {
  test("搜尋後導覽回首頁，header 搜尋欄清空", async ({ page }) => {
    // header 搜尋欄僅在 lg 斷點顯示（見 navbar-client.tsx `hidden ... lg:flex`），
    // Desktop Chrome 專案預設 viewport 1280x720 已足夠寬，無需額外設定。
    await page.goto("/");
    const searchInput = page.locator("header form input[type='text']");
    await expect(searchInput).toBeVisible();
    // SearchInput 為 controlled input，掛載前被 useHydrated gate 禁用；
    // 等待 enabled 確保 hydration 完成、onChange 已附掛，fill 的值才會進 React state
    await expect(searchInput).toBeEnabled({ timeout: 15000 });

    const keyword = "策略";
    await searchInput.fill(keyword);
    await searchInput.press("Enter");

    // 導覽至搜尋結果頁，且 header 搜尋欄反映查詢字串
    await page.waitForURL(/\/search\?q=/);
    await expect(searchInput).toHaveValue(keyword);

    // 點擊 logo 回首頁
    await page.getByRole("link", { name: "返回首頁" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(searchInput).toHaveValue("");
  });
});

test.describe("登出流程", () => {
  test("登入後可以登出並重導向", async ({ page }) => {
    // 先登入
    await loginAsAdmin(page);


    // sidebar 載入後尋找登出連結（/logout?callbackUrl=/login）
    const logoutLink = page.locator("aside a[href*='logout']").first();
    await expect(logoutLink).toBeVisible();
    await logoutLink.click();

    // 等待重導向到登入頁
    await page.waitForURL("**/login**", { timeout: 15000 });
    expect(page.url()).toContain("/login");
  });
});

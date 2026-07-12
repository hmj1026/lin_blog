// 這些測試需要一個正在執行的 DB（Postgres）與 dev server（見 tests/e2e/auth.setup.ts）。
// 驗證 fix-perf-caching Section 4：/blog/[slug] 改用 ISR（revalidate=60）+ draftMode 後，
// 已發布文章可正常渲染、草稿僅能透過 /api/preview 的 draft bypass cookie 檢視，
// 一般訪客無法看到草稿內容（回傳 404）。
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("ISR 公開頁與草稿預覽", () => {
  test("A. 匿名訪客可正常瀏覽已發布文章（無需 session 查詢）", async ({ page }) => {
    await page.goto("/blog");
    const firstPostLink = page.locator("a[href^='/blog/']").first();
    await expect(firstPostLink).toBeVisible();
    await firstPostLink.click();

    await expect(page.locator("article")).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  // 使用 seed 建立的固定草稿 fixture（slug: e2e-draft-fixture、status: DRAFT），
  // 避免依賴不穩定的後台編輯器建立流程，直接驗證 Section 4 的 draftMode 授權閘門。
  const DRAFT_FIXTURE_SLUG = "e2e-draft-fixture";
  const DRAFT_FIXTURE_TITLE = "E2E 草稿預覽 Fixture";

  test("B. 已登入編輯者可透過 /api/preview 檢視草稿", async ({ page }) => {
    await loginAsAdmin(page);

    // 透過 /api/preview 啟用 draftMode（帶 draft bypass cookie 重導向至 /blog/[slug]），
    // 具 posts:write 權限的編輯者應能看到 DRAFT 文章內容。
    await page.goto(`/api/preview?slug=${encodeURIComponent(DRAFT_FIXTURE_SLUG)}`);
    await expect(page).toHaveURL(new RegExp(`/blog/${DRAFT_FIXTURE_SLUG}`));
    await expect(page.locator("h1")).toContainText(DRAFT_FIXTURE_TITLE);
  });

  test("C. 匿名訪客無法直接檢視草稿（404）", async ({ page }) => {
    // 匿名（無 draft bypass cookie）直接請求草稿頁，getReadablePostBySlug 以
    // allowDraft=false 過濾，應回傳 404。
    const response = await page.goto(`/blog/${encodeURIComponent(DRAFT_FIXTURE_SLUG)}`);
    expect(response?.status()).toBe(404);
  });
});

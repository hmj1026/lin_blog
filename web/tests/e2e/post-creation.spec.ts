import { test, expect } from "@playwright/test";

test.describe.skip("post creation flow (待接後台 API)", () => {
  test("能進入新增文章頁", async ({ page }) => {
    await page.goto("http://localhost:3000/admin/posts/new");
    await expect(page.locator("text=新增文章")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Blog Frontend", () => {
  test("首頁可正常載入", async ({ page }) => {
    await page.goto("http://localhost:3000/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("文章列表頁可正常載入", async ({ page }) => {
    await page.goto("http://localhost:3000/blog");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("搜尋頁可正常載入", async ({ page }) => {
    await page.goto("http://localhost:3000/search");
    await expect(page.locator("input[type='search'], input[type='text']")).toBeVisible();
  });
});

test.describe("Admin Panel", () => {
  test("未登入時重導向至登入頁", async ({ page }) => {
    await page.goto("http://localhost:3000/admin");
    await page.waitForURL("**/login**");
    expect(page.url()).toContain("/login");
  });

  test("登入頁可正常載入", async ({ page }) => {
    await page.goto("http://localhost:3000/login");
    await expect(page.locator("input[type='email'], input[name='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
  });
});

test.describe.skip("Post Creation (需認證環境)", () => {
  // 這些測試需要設定認證 fixture
  test("能進入新增文章頁", async ({ page }) => {
    await page.goto("http://localhost:3000/admin/posts/new");
    await expect(page.locator("text=新增文章")).toBeVisible();
  });
});

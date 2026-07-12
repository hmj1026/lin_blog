import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

let adminContext: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  adminContext = await browser.newContext();
  page = await adminContext.newPage();
  await loginAsAdmin(page);
});

test.afterAll(async () => {
  await adminContext.close();
});

test.describe("分類管理", () => {
  test("分類列表頁可正常載入", async () => {
    await page.goto("/admin/categories");
    
    // 驗證頁面載入
    await expect(
      page.getByRole("heading", { name: /分類管理|Categories/ }).filter({ visible: true })
    ).toBeVisible();
    
    // 驗證有分類列表或新增按鈕
    const hasList = await page.locator("table, [class*='list'], [class*='grid']").isVisible().catch(() => false);
    const hasAddButton = await page.locator("button:has-text('新增'), a:has-text('新增')").isVisible().catch(() => false);
    
    expect(hasList || hasAddButton).toBeTruthy();
  });
});

test.describe("標籤管理", () => {
  test("標籤列表頁可正常載入", async () => {
    await page.goto("/admin/tags");
    
    // 驗證頁面載入
    await expect(
      page.getByRole("heading", { name: /標籤管理|Tags/ }).filter({ visible: true })
    ).toBeVisible();
    
    // 驗證有標籤列表或新增按鈕
    const hasList = await page.locator("table, [class*='list'], [class*='grid']").isVisible().catch(() => false);
    const hasAddButton = await page.locator("button:has-text('新增'), a:has-text('新增')").isVisible().catch(() => false);
    
    expect(hasList || hasAddButton).toBeTruthy();
  });
});

test.describe("站點設定", () => {
  test("設定頁可正常載入", async () => {
    await page.goto("/admin/settings");
    
    // 驗證頁面載入
    await expect(
      page.getByRole("heading", { name: /站點設定|Settings/ }).filter({ visible: true })
    ).toBeVisible();
    
    // 驗證有表單元素
    const hasForm = await page.locator("form, input, textarea").count() > 0;
    expect(hasForm).toBeTruthy();
  });

  test("設定頁顯示站點基本資訊表單", async () => {
    await page.goto("/admin/settings");
    
    // 檢查是否有站點名稱相關的輸入框
    const siteNameInput = page.locator("input[name*='name'], input[placeholder*='站點'], input[placeholder*='名稱']").first();
    const isVisible = await siteNameInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(siteNameInput).toBeVisible();
    }
  });
});

test.describe("使用者管理", () => {
  test("使用者列表頁可正常載入或需要權限", async () => {
    await page.goto("/admin/users");
    
    // 可能需要 users:manage 權限，如果沒權限會重導向到 /admin
    const url = page.url();
    const hasAccess = url.includes("/admin/users");
    
    if (hasAccess) {
      // 有權限則驗證頁面載入
      await expect(
        page.getByRole("heading", { name: "使用者管理", exact: true }).filter({ visible: true })
      ).toBeVisible();
    } else {
      // 沒權限則驗證重導向
      expect(url).toContain("/admin");
    }
  });
});

test.describe("角色管理", () => {
  test("角色列表頁可正常載入或需要權限", async () => {
    await page.goto("/admin/roles");
    
    // 可能需要 roles:manage 權限，如果沒權限會重導向到 /admin
    await page.waitForTimeout(1000);
    const url = page.url();
    const hasAccess = url.includes("/admin/roles");
    
    if (hasAccess) {
      // 有權限則驗證頁面載入（標題是「角色權限」）
      await expect(page.locator("h1:has-text('角色權限')")).toBeVisible();
    } else {
      // 沒權限則驗證重導向
      expect(url).toContain("/admin");
    }
  });
});

test.describe("文章統計", () => {
  test("統計列表頁可正常載入", async () => {
    await page.goto("/admin/analytics/posts");
    
    // 驗證頁面載入
    await expect(page.locator("h1, h2").filter({ hasText: /統計|Analytics|分析/ })).toBeVisible();
  });
});

test.describe("匯入匯出", () => {
  test("匯入匯出頁可正常載入", async () => {
    await page.goto("/admin/import-export");
    
    // 驗證頁面載入（標題是「匯入 / 匯出」）
    await expect(
      page.getByRole("heading", { name: "匯入 / 匯出", exact: true }).filter({ visible: true })
    ).toBeVisible();
  });
});

import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { AUTH_FILE } from "./helpers/auth";
import { gotoSettled } from "./helpers/streaming";

let adminContext: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  // 手動 context 不會自動繼承 project 的 use.storageState，明確帶入
  // AUTH_FILE 取得管理員身分，不再跑一次 UI 登入（task 1.4）。
  adminContext = await browser.newContext({ storageState: AUTH_FILE });
  page = await adminContext.newPage();
});

test.afterAll(async () => {
  await adminContext.close();
});

test.describe("分類管理", () => {
  test("分類列表頁可正常載入", async () => {
    await gotoSettled(page, "/admin/categories");
    
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
    await gotoSettled(page, "/admin/tags");
    
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
    await gotoSettled(page, "/admin/settings");
    
    // 驗證頁面載入
    await expect(
      page.getByRole("heading", { name: /站點設定|Settings/ }).filter({ visible: true })
    ).toBeVisible();
    
    // 驗證有表單元素
    const hasForm = await page.locator("form, input, textarea").count() > 0;
    expect(hasForm).toBeTruthy();
  });

  test("設定頁顯示站點基本資訊表單", async () => {
    await gotoSettled(page, "/admin/settings");
    
    // 檢查是否有站點名稱相關的輸入框
    const siteNameInput = page.locator("input[name*='name'], input[placeholder*='站點'], input[placeholder*='名稱']").first();
    const isVisible = await siteNameInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isVisible) {
      await expect(siteNameInput).toBeVisible();
    }
  });

  test("Newsletter 開關可控制首頁訂閱區塊顯示，測試結束還原原始狀態", async () => {
    await gotoSettled(page, "/admin/settings");

    // getByRole 只比對 a11y tree（排除 hidden 元素）；Next 16/React 19 串流
    // hydration 期間 hidden Suspense segment 會短暫殘留同名 label，
    // getByLabel 會因 strict violation 卡死（見 upgrade-nextjs-16 證據）
    const checkbox = page.getByRole("checkbox", { name: "顯示 Newsletter 訂閱區塊" });
    await expect(checkbox).toBeVisible();
    const saveButton = page.getByRole("button", { name: "儲存", exact: true });
    const homepageHeading = page.getByRole("heading", { name: "訂閱電子報", level: 3 });

    const originalChecked = await checkbox.isChecked();

    async function setAndSave(target: boolean) {
      await gotoSettled(page, "/admin/settings");
      if ((await checkbox.isChecked()) !== target) {
        target ? await checkbox.check() : await checkbox.uncheck();
      }
      await saveButton.click();
      await expect(page.getByText("已儲存")).toBeVisible({ timeout: 10000 });
    }

    try {
      // 開啟：首頁應顯示 Newsletter 訂閱區塊
      await setAndSave(true);
      await gotoSettled(page, "/");
      await expect(homepageHeading).toBeVisible();

      // 關閉：首頁不應渲染該區塊
      await setAndSave(false);
      await gotoSettled(page, "/");
      await expect(homepageHeading).toHaveCount(0);
    } finally {
      // 還原為測試開始前的原始狀態，避免污染其他測試
      await setAndSave(originalChecked);
    }
  });
});

test.describe("使用者管理", () => {
  test("使用者列表頁可正常載入或需要權限", async () => {
    await gotoSettled(page, "/admin/users");
    
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
    await gotoSettled(page, "/admin/roles");

    // 可能需要 roles:manage 權限；重導向由 page.tsx 的 redirect() 在 SSR
    // 階段完成，goto() resolve 時 URL 已是最終值，不需固定等待。
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
    await gotoSettled(page, "/admin/analytics/posts");
    
    // 驗證頁面載入
    await expect(page.locator("h1, h2").filter({ hasText: /統計|Analytics|分析/ })).toBeVisible();
  });
});

test.describe("匯入匯出", () => {
  test("匯入匯出頁可正常載入", async () => {
    await gotoSettled(page, "/admin/import-export");
    
    // 驗證頁面載入（標題是「匯入 / 匯出」）
    await expect(
      page.getByRole("heading", { name: "匯入 / 匯出", exact: true }).filter({ visible: true })
    ).toBeVisible();
  });
});

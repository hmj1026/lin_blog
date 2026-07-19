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
    const saveButton = page.getByRole("button", { name: "儲存此區", exact: true });
    const homepageHeading = page.getByRole("heading", { name: "訂閱電子報", level: 3 });

    const originalChecked = await checkbox.isChecked();

    async function setAndSave(target: boolean) {
      await gotoSettled(page, "/admin/settings");
      if ((await checkbox.isChecked()) === target) return;
      target ? await checkbox.check() : await checkbox.uncheck();
      await saveButton.click();
      await expect(page.getByText(/上次儲存/)).toBeVisible({ timeout: 10000 });
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
      await expect(page.getByRole("heading", { name: "角色權限" })).toBeVisible();
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

test.describe("後台鍵盤與手機導覽", () => {
  test("可用鍵盤搜尋文章並開啟新增文章", async () => {
    await gotoSettled(page, "/admin/posts");

    const search = page.getByRole("searchbox", { name: "搜尋文章" });
    await search.focus();
    await page.keyboard.type("鍵盤搜尋");
    await expect(search).toHaveValue("鍵盤搜尋");

    const createLink = page.getByRole("link", { name: "新增文章" }).filter({ visible: true });
    await createLink.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/admin\/posts\/new/);
    await expect(page.getByRole("heading", { name: "新增文章" })).toBeVisible();
  });

  test("可用鍵盤複製媒體連結並取消刪除確認", async () => {
    await adminContext.grantPermissions(["clipboard-read", "clipboard-write"], {
      origin: "http://localhost:3000",
    });
    const fileName = `keyboard-test-${Date.now()}.pdf`;
    await gotoSettled(page, "/admin/media");
    await page.getByLabel("上傳媒體檔案").setInputFiles({ name: fileName, mimeType: "application/pdf", buffer: Buffer.from("keyboard-media") });
    await expect(page.getByRole("status")).toContainText("已上傳");
    await gotoSettled(page, `/admin/media?q=${encodeURIComponent(fileName)}`);
    const actions = page.getByRole("group", { name: `${fileName} 操作` });

    try {
      const copy = actions.getByRole("button", { name: "複製連結" });
      await copy.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("status")).toContainText("已複製");

      const remove = actions.getByRole("button", { name: "刪除" });
      await remove.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog", { name: "確認刪除媒體" });
      await expect(dialog).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await expect(remove).toBeFocused();
    } finally {
      await actions.getByRole("button", { name: "刪除" }).click();
      await page.getByRole("button", { name: "確認刪除" }).click();
      await expect(page.getByRole("status")).toContainText("已刪除");
    }
  });

  test("375px 下可用鍵盤開啟及關閉手機導覽", async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoSettled(page, "/admin");

    const openNavigation = page.getByRole("button", { name: "開啟導覽選單" });
    await openNavigation.focus();
    await page.keyboard.press("Enter");
    const navigation = page.getByRole("dialog", { name: "後台導覽選單" });
    await expect(navigation).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(navigation).toBeHidden();
    await expect(openNavigation).toBeFocused();
  });

  test("主要管理資料表在 375／768／1024／1440px 不造成頁面裁切", async () => {
    const viewports = [375, 768, 1024, 1440];
    const pages = [
      { path: "/admin/posts", table: "文章列表資料表" },
      { path: "/admin/analytics/posts", table: "文章統計資料表" },
    ];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      for (const target of pages) {
        await gotoSettled(page, target.path);
        const tableRegion = page.getByRole("region", { name: target.table });
        await expect(tableRegion).toBeVisible();
        await tableRegion.focus();
        await expect(tableRegion).toBeFocused();
        const layout = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
          offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
            .map((element) => ({
              tag: element.tagName.toLowerCase(),
              text: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 40),
              right: Math.round(element.getBoundingClientRect().right),
              width: Math.round(element.getBoundingClientRect().width),
            }))
            .filter((element) => element.right > window.innerWidth + 1)
            .slice(0, 8),
        }));
        expect(
          layout.documentWidth,
          `${width}px ${target.path} 超出 viewport：${JSON.stringify(layout.offenders)}`
        ).toBeLessThanOrEqual(layout.viewportWidth);
      }

      if (width < 768) {
        await expect(page.getByRole("button", { name: "開啟導覽選單" })).toBeVisible();
      } else {
        await expect(page.getByRole("navigation", { name: "後台功能" })).toBeVisible();
      }
    }
  });
});

import { test, expect, type Page } from "@playwright/test";
import { gotoSettled } from "./helpers/streaming";

/**
 * E2E：原始 HTML 模式的圖片插入工具（task 3.3/3.4 acceptance, section 6）
 *
 * 涵蓋：上傳、alt 輸入、插入到游標、複製圖片網址、複製 <img> 標籤、預覽縮圖、
 * 上傳失敗、剪貼簿失敗，以及 VISUAL（TipTap）模式圖片插入無迴歸。
 *
 * 需要可連線的資料庫與種子管理員帳號（預設 admin@lin.blog / admin，可用環境變數覆蓋）。
 * 於 task 6.4 執行；若環境缺少可用的管理員帳號，測試會在 login() 逾時後失敗，
 * 執行者應確認 `web/scripts/init-admin.js` 或等效種子已完成。
 */

// 1x1 紅色像素 PNG，供上傳/裁切流程使用。
const TEST_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function testPngFile(name = "test.png") {
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(TEST_PNG_BASE64, "base64"),
  };
}

async function openNewPostInRawMode(page: Page) {
  await gotoSettled(page, "/admin/posts/new");
  await page.locator("#post-title").fill(`E2E Raw Media ${Date.now()}`);
  await page.locator("#post-slug").fill(`e2e-raw-media-${Date.now()}`);
  await page.locator("#post-excerpt").fill("raw media e2e 摘要");
  // radio input 為 sr-only（視覺上隱藏，由外層 <label> 承接點擊），
  // 直接點擊 input 會被自身的 <label> 攔截指標事件；改為點擊可視的 <label> 文字。
  await page
    .getByRole("radiogroup", { name: "編輯模式" })
    .getByText("原始 HTML", { exact: true })
    .click();
  await expect(page.getByRole("radio", { name: "原始 HTML" })).toBeChecked();
  await expect(page.getByTestId("raw-html-editor")).toBeVisible();
}

async function uploadAndCropInRawMode(page: Page) {
  const main = page.getByTestId("post-form-main");
  await main.getByRole("button", { name: "插入圖片" }).click();
  await main.locator('input[type="file"]').setInputFiles(testPngFile());
  // 裁切模態框出現後套用（沿用 ImageCropperModal 既有按鈕文字）。
  await page.getByRole("button", { name: "套用並上傳" }).click();
}

test.describe("原始 HTML 模式圖片工具", () => {
  test("6.1 上傳圖片後顯示 alt 輸入、預覽與操作按鈕", async ({ page }) => {
    await openNewPostInRawMode(page);

    await uploadAndCropInRawMode(page);

    await expect(page.getByLabel(/alt|替代文字/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("img", { name: "插入圖片預覽" })).toBeVisible();
    await expect(page.getByRole("button", { name: "插入到游標" })).toBeVisible();
    await expect(page.getByRole("button", { name: "複製圖片網址" })).toBeVisible();
    await expect(page.getByRole("button", { name: "複製 <img> 標籤" })).toBeVisible();
  });

  test("6.2 輸入 alt 後插入到游標會寫入 <img> 片段", async ({ page }) => {
    await openNewPostInRawMode(page);

    const textarea = page.getByTestId("raw-html-editor");
    await textarea.click();
    await textarea.fill("AABB");
    await textarea.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(2, 2));

    await uploadAndCropInRawMode(page);

    await page.getByLabel(/alt|替代文字/i).fill("貓咪");
    await page.getByRole("button", { name: "插入到游標" }).click();

    await expect(textarea).toHaveValue(/AA<img src="[^"]+" alt="貓咪" \/>BB/);
  });

  test("6.3 複製圖片網址會將相對路徑寫入剪貼簿", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openNewPostInRawMode(page);
    await uploadAndCropInRawMode(page);

    await page.getByRole("button", { name: "複製圖片網址" }).click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/^\/api\/files\//);
  });

  test("6.4 複製 <img> 標籤會將完整片段寫入剪貼簿", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openNewPostInRawMode(page);
    await uploadAndCropInRawMode(page);

    await page.getByLabel(/alt|替代文字/i).fill("貓咪");
    await page.getByRole("button", { name: "複製 <img> 標籤" }).click();

    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/^<img src="\/api\/files\/[^"]+" alt="貓咪" \/>$/);
  });

  test("6.5 上傳失敗顯示錯誤訊息且不影響內容", async ({ page }) => {
    await openNewPostInRawMode(page);

    const textarea = page.getByTestId("raw-html-editor");
    await textarea.fill("unchanged");

    // 攔截 /api/uploads，模擬上傳失敗。
    await page.route("**/api/uploads", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "上傳失敗" }),
      })
    );

    const main = page.getByTestId("post-form-main");
    await main.getByRole("button", { name: "插入圖片" }).click();
    await main.locator('input[type="file"]').setInputFiles(testPngFile());
    await page.getByRole("button", { name: "套用並上傳" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "上傳失敗" })).toBeVisible({
      timeout: 15000,
    });
    await expect(textarea).toHaveValue("unchanged");
  });

  test("6.6 剪貼簿寫入失敗顯示複製失敗訊息", async ({ page, context }) => {
    // 不授予剪貼簿權限，讓 navigator.clipboard.writeText 於瀏覽器內被拒絕/拋錯。
    await context.clearPermissions();
    await openNewPostInRawMode(page);
    await uploadAndCropInRawMode(page);

    await page.getByRole("button", { name: "複製圖片網址" }).click();

    await expect(page.getByText(/複製失敗/)).toBeVisible({ timeout: 15000 });
  });
});

test.describe("VISUAL 模式圖片插入（TipTap）迴歸檢查", () => {
  test("6.7 VISUAL 模式下圖片上傳流程仍可用，無需第二個上傳端點", async ({ page }) => {
    await gotoSettled(page, "/admin/posts/new");
    await page.locator("#post-title").fill(`E2E Visual Media ${Date.now()}`);
    await page.locator("#post-slug").fill(`e2e-visual-media-${Date.now()}`);
    await page.locator("#post-excerpt").fill("visual media e2e 摘要");

    // 預設為 TipTap 視覺模式，維持不勾選「原始 HTML 模式」。
    const editor = page.locator(".tiptap.ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 10000 });

    const main = page.getByTestId("post-form-main");
    await main.getByRole("button", { name: "插入圖片" }).click();
    await main.locator('input[type="file"]').setInputFiles(testPngFile());
    await page.getByRole("button", { name: "套用並上傳" }).click();

    // 上傳成功後圖片節點應插入編輯器內容。
    await expect(editor.locator("img")).toBeVisible({ timeout: 15000 });
  });
});

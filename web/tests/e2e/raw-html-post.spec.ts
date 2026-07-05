import { test, expect, type Page } from "@playwright/test";

/**
 * E2E：原始 HTML 模式（allowRawHtml）文章的隔離 iframe 渲染
 *
 * 涵蓋：自訂樣式生效、注入的 <script> 不執行、樣式不外洩、ToC 點擊捲動、預覽巢狀 iframe。
 * 需要可連線的資料庫與種子管理員帳號（預設 admin@lin.blog / admin，可用環境變數覆蓋）。
 */

const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@lin.blog";
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin";

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("input[type='email'], input[name='email']", E2E_ADMIN_EMAIL);
  await page.fill("input[type='password']", E2E_ADMIN_PASSWORD);
  await page.click("button[type='submit']");
  await page.waitForURL("**/admin**", { timeout: 15000 });
}

// 原始 HTML 內容：自訂 <style>（含會嘗試外洩到 body/h1 的規則）、兩個 H2（供 ToC）、
// 一個高間隔區塊（讓第二章遠在下方以驗證捲動），以及會在儲存階段被消毒移除的 <script>。
const RAW_CONTENT = `<style>
  .raw-marker { color: rgb(255, 0, 0); }
  h1 { color: rgb(0, 128, 0); }
  body { background-color: rgb(10, 20, 30); }
</style>
<p class="raw-marker">RAW STYLED PARAGRAPH</p>
<p><a id="home-link" href="/">回首頁</a></p>
<h2>第一章</h2>
<p>第一章內容。</p>
<div style="height: 1600px"></div>
<h2>第二章</h2>
<p id="tail">第二章內容結尾。</p>
<script>window.__xss_executed = true; alert('xss');</script>`;

// 這些測試共用同一篇文章（beforeAll 建立），以序列模式在單一 worker 執行，
// 避免多 worker 各自建立文章造成 slug 唯一鍵衝突。
test.describe.configure({ mode: "serial" });

test.describe("raw-html-post", () => {
  let slug = "";
  let postId = "";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page);

    slug = `raw-html-e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const res = await page.request.post("/api/posts", {
      data: {
        slug,
        title: "Raw HTML E2E",
        excerpt: "raw html e2e 摘要",
        content: RAW_CONTENT,
        allowRawHtml: true,
        status: "PUBLISHED",
        categoryIds: [],
        tagIds: [],
      },
    });
    expect(res.ok(), `建立文章失敗：${res.status()}`).toBeTruthy();
    const body = await res.json();
    postId = body?.data?.id ?? "";
    expect(postId).not.toBe("");
    await context.close();
  });

  test("8.1 自訂樣式在隔離 iframe 內生效", async ({ page }) => {
    await page.goto(`/blog/${slug}`);
    const frame = page.frameLocator("iframe[title='post-content']");
    const marker = frame.locator(".raw-marker");
    await expect(marker).toBeVisible({ timeout: 15000 });
    const color = await marker.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe("rgb(255, 0, 0)");
  });

  test("8.2 注入的 <script> 不會執行", async ({ page }) => {
    let dialogFired = false;
    page.on("dialog", async (dialog) => {
      dialogFired = true;
      await dialog.dismiss();
    });
    await page.goto(`/blog/${slug}`);
    // 給 iframe 充足時間載入其自寫腳本（若使用者腳本殘留，alert 會在此期間觸發）
    await page.waitForTimeout(1500);
    expect(dialogFired).toBe(false);
  });

  test("8.3 文章樣式不外洩到站台其餘部分", async ({ page }) => {
    await page.goto(`/blog/${slug}`);
    await page.locator("iframe[title='post-content']").waitFor({ state: "attached" });
    // 外層文章標題 h1 不應被 iframe 內 h1{color:green} 影響
    const outerH1Color = await page.locator("h1").first().evaluate((el) => getComputedStyle(el).color);
    expect(outerH1Color).not.toBe("rgb(0, 128, 0)");
    // 外層 body 背景不應被 iframe 內 body{background} 影響
    const outerBodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(outerBodyBg).not.toBe("rgb(10, 20, 30)");
  });

  test("8.4 點擊目錄可捲動至對應標題", async ({ page }) => {
    await page.goto(`/blog/${slug}`);
    const tocButtons = page.locator("nav[aria-label='目錄'] button");
    await expect(tocButtons).toHaveCount(2, { timeout: 15000 });
    const before = await page.evaluate(() => window.scrollY);
    await tocButtons.nth(1).click();
    // 等待平滑捲動穩定
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBeGreaterThan(before + 100);
  });

  test("8.4b iframe 內連結點擊由父頁面代為導覽", async ({ page }) => {
    await page.goto(`/blog/${slug}`);
    const frame = page.frameLocator("iframe[title='post-content']");
    await frame.locator("#home-link").click();
    // sandbox 擋掉 iframe 內導覽，改由父頁面 postMessage 代為導覽至首頁
    await page.waitForURL((url) => new URL(url).pathname === "/", { timeout: 10000 });
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("8.5 預覽流程正確顯示巢狀 iframe", async ({ page }) => {
    await login(page);
    await page.goto(`/admin/posts/${postId}`);
    await page.locator("button:has-text('預覽')").first().click();
    const previewFrame = page.frameLocator("iframe[title='post-preview']");
    const postFrame = previewFrame.frameLocator("iframe[title='post-content']");
    await expect(postFrame.locator(".raw-marker")).toBeVisible({ timeout: 20000 });
  });
});

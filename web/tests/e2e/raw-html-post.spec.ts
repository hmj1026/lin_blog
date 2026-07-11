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
<p><a id="jump-link" href="#tail">跳到結尾</a></p>
<p><a id="missing-link" href="#no-such-id">壞錨點</a></p>
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
        showRawHtmlToc: true,
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

  test("8.4c 內文 # 錨點連結由父頁面捲動", async ({ page }) => {
    await page.goto(`/blog/${slug}`);
    const frame = page.frameLocator("iframe[title='post-content']");
    await expect(frame.locator("#jump-link")).toBeVisible({ timeout: 15000 });
    // click() 的 actionability 檢查會先自動把不在可視範圍的元素捲入視野；
    // 先在此明確捲動並等待穩定，避免這個自動捲動污染下面量測的 before/after 差值。
    await frame.locator("#jump-link").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => window.scrollY);
    await frame.locator("#jump-link").click();
    // 等待平滑捲動穩定
    await page.waitForTimeout(1200);
    // srcdoc iframe 無 <base> 時，creator base URL 是外層真實頁面 URL，
    // 而 document.URL 是 about:srcdoc；瀏覽器判斷 fragment-only 連結是否為
    // 「同文件導覽」時比較兩者，不相等 → 判定為跨文件導覽 → iframe 對自己
    // 重新 fetch 並載入外層真實頁面（遞迴內嵌整站）。此斷言在 iframe 內偵測
    // 「是否又長出一層巢狀 iframe」，捕捉此自我重載，比之後的座標範圍斷言更
    // 決定性（不受 reload 時序競爭影響）。
    await expect(page.locator("iframe[title='post-content'] iframe")).toHaveCount(0);
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBeGreaterThan(before + 100);
    // 目標必須落在外層 sticky header 下方，且與側邊欄 ToC 捲動邏輯
    // （iframeTop + offset - SCROLL_HEADER_OFFSET，SCROLL_HEADER_OFFSET = 80）一致：
    // 攔截後應 ≈80px；瀏覽器預設 fragment 捲動則會貼齊視窗頂端 ≈0px（被 header 遮住）。
    // boundingBox() 對 iframe 內元素回傳的座標已經是相對主 frame viewport（自動含 frame 偏移）。
    const tailBox = await frame.locator("#tail").boundingBox();
    expect(tailBox).not.toBeNull();
    const tailViewportTop = tailBox!.y;
    expect(tailViewportTop).toBeGreaterThanOrEqual(40);
    // 上界放寬為「視窗高度 - 40」而非固定 160：GREEN 後父層
    // scrollTo(iframeTop + offset - 80) 若超過文件最大可捲動量會被瀏覽器
    // 截斷在底部，#tail 可能停在 >160 但仍在視窗可視範圍內；預設（壞）行為
    // 的 y≈2200 遠超視窗高度，此上界仍足以判別兩者。
    expect(tailViewportTop).toBeLessThanOrEqual((page.viewportSize()?.height ?? 720) - 40);
  });

  test("8.4d 指向不存在 id 的 # 錨點為安全 no-op", async ({ page }) => {
    await page.goto(`/blog/${slug}`);
    const frame = page.frameLocator("iframe[title='post-content']");
    await expect(frame.locator("#missing-link")).toBeVisible({ timeout: 15000 });
    // 同 8.4c：先讓 click() 的自動捲動塵埃落定，避免污染 before/after 差值量測。
    await frame.locator("#missing-link").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const before = await page.evaluate(() => window.scrollY);
    await frame.locator("#missing-link").click();
    await page.waitForTimeout(1200);
    // 同 8.4c：找不到 target 的壞錨點也不應觸發 srcdoc 自我重載。
    await expect(page.locator("iframe[title='post-content'] iframe")).toHaveCount(0);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(50);
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

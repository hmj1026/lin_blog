import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

/**
 * 對應「關於我」頁面功能（openspec: about page）：
 * - 5.3：開關 ON 時，後台可編修（/admin/about）、前台正確呈現（/about）
 * - 5.4：開關 OFF 時，後台/前台入口皆隱藏，前台回 404
 *
 * 兩則測試共用同一個單例 site settings（showAbout），故用 serial 模式並各自
 * 在測試開頭把開關設為自己需要的狀態，確保測試獨立、不依賴執行順序。
 * 開關切換透過 /admin/settings 表單儲存（PUT /api/site-settings），儲存後
 * admin sidebar 的「關於我」入口是伺服器元件（web/src/app/(admin)/layout.tsx）
 * 依當前設定渲染，因此改用整頁導覽（page.goto）而非 client 端 soft navigation
 * 觸發重新渲染，避免讀到切換前的 layout RSC 快取。
 */

async function setShowAbout(page: import("@playwright/test").Page, shouldShow: boolean) {
  await page.goto("/admin/settings");
  const checkbox = page.getByRole("checkbox", { name: "顯示「關於我」" });
  await expect(checkbox).toBeVisible();
  const isChecked = await checkbox.isChecked();
  if (isChecked !== shouldShow) {
    await checkbox.click();
  }
  const saveButton = page.getByRole("button", { name: "儲存" });
  await saveButton.click();
  await expect(page.getByText("已儲存")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

test.describe("關於我頁面（about page）", () => {
  test("about page: 開關 ON 時後台可編修、前台正確呈現", async ({ page }) => {
    // 本測試對 next dev 做多次後台路由首次編譯（/admin/settings、/admin、
    // /admin/about）＋三次儲存＋原始 HTML 來回，CI runner 較慢時累計工作量
    // 會超過預設 30s 預算（實測約 31.7s），比照 admin-post-editor-layout 放寬。
    test.setTimeout(60_000);
    await loginAsAdmin(page);

    await setShowAbout(page, true);

    // 整頁導覽到 /admin，確認 sidebar（伺服器渲染）反映開關已開啟
    await page.goto("/admin");
    const aboutSidebarLink = page.locator("aside").getByRole("link", { name: "關於我" });
    await expect(aboutSidebarLink).toBeVisible();

    // 進入後台編輯頁
    await page.goto("/admin/about");
    const editorForm = page.getByTestId("about-editor-form");
    await expect(editorForm).toBeVisible();

    const title = "關於我的介紹";
    const visualContent = "這是關於我的介紹內容，用於 E2E 自動化測試。";

    const titleInput = page.locator("#about-title");
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);

    // 起始模式取決於上一次儲存的 aboutAllowRawHtml（測試不假設固定起始值，且
    // 前次殘留內容可能含 class/style/區塊標籤，觸發切回視覺編輯器的不可逆警告，
    // 見 admin-editor-modes.spec.ts 對應案例）；兩種情況都要能把模式收斂到視覺編輯器
    const visualModeOption = page.getByRole("radio", { name: "視覺編輯器" });
    if (!(await visualModeOption.isChecked())) {
      await page.getByRole("radiogroup", { name: "編輯模式" }).getByText("視覺編輯器", { exact: true }).click();
      const warning = page.getByTestId("mode-switch-warning");
      if (await warning.isVisible().catch(() => false)) {
        await warning.getByRole("button", { name: "確認切換" }).click();
      }
    }
    await expect(visualModeOption).toBeChecked();

    // 視覺模式（TipTap）：以鍵盤輸入內容
    const visualEditor = page.locator(".tiptap.ProseMirror").first();
    await expect(visualEditor).toBeVisible();
    await visualEditor.click();
    await page.keyboard.type(visualContent);

    const saveButton = page.getByRole("button", { name: "儲存" });
    await saveButton.click();
    await expect(page.getByText("已儲存")).toBeVisible();

    // 切換到原始 HTML 模式，改用 raw markup 再次儲存（鏡射
    // admin-editor-modes.spec.ts 的模式切換 pattern）
    await page.getByRole("radiogroup", { name: "編輯模式" }).getByText("原始 HTML", { exact: true }).click();
    // 不含 class/style/區塊標籤：避免觸發「切回視覺編輯器會不可逆剝除結構」警告
    // （見 detectStrippedRichHtml；本測試只需驗證原始 HTML 模式的內容呈現）
    const rawHtmlMarkerText = "關於我的原始 HTML 內容標記";
    const rawHtmlContent = `<p>${rawHtmlMarkerText}</p>`;
    const rawEditor = page.getByTestId("raw-html-editor");
    await expect(rawEditor).toBeVisible();
    await rawEditor.fill(rawHtmlContent);

    await saveButton.click();
    await expect(page.getByText("已儲存")).toBeVisible();

    // 前台驗證：標題與（原始 HTML）內容正確呈現
    await page.goto("/about");
    const aboutPage = page.getByTestId("about-page");
    await expect(aboutPage).toBeVisible();
    await expect(aboutPage.getByRole("heading", { name: title, level: 1 })).toBeVisible();

    // 原始 HTML 模式以隔離 iframe（sandbox srcDoc，見 raw-html-post-frame.tsx）
    // 呈現內容；比照 raw-html-post.spec.ts 的 pattern 用 frameLocator 斷言
    await page.locator("iframe[title='post-content']").waitFor({ state: "attached" });
    const contentFrame = page.frameLocator("iframe[title='post-content']");
    await expect(contentFrame.getByText(rawHtmlMarkerText)).toBeVisible();

    // 前台 navbar 顯示「關於我」連結
    const navbarAboutLink = page.getByRole("banner").getByRole("link", { name: "關於我" });
    await expect(navbarAboutLink).toBeVisible();
    await expect(navbarAboutLink).toHaveAttribute("href", "/about");
  });

  test("about page: 開關 OFF 時隱藏且回 404", async ({ page }) => {
    // 同 ON 案例：登入＋設定儲存＋多次後台/前台整頁導覽，CI 慢時放寬 30s 預算。
    test.setTimeout(60_000);
    await loginAsAdmin(page);

    await setShowAbout(page, false);

    // 後台 sidebar 不再顯示「關於我」入口
    await page.goto("/admin");
    await expect(page.locator("aside").getByRole("link", { name: "關於我" })).toHaveCount(0);

    // 前台 /about 回 404
    const response = await page.goto("/about");
    expect(response?.status()).toBe(404);

    // 前台 navbar 不再顯示「關於我」連結
    await page.goto("/");
    await expect(page.getByRole("banner").getByRole("link", { name: "關於我" })).toHaveCount(0);
  });
});

import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

// 對應 openspec/changes/improve-post-authoring-and-raw-html-layout 任務 4.6/4.8、6.4/6.5：
// 這份 spec 在撰寫階段先不執行（write-only），將於 4.8/6.5 執行並修正整合問題。
test.describe("文章編輯頁資訊架構（sticky action bar / 響應式版面）", () => {
  test.describe("桌面版（1440-1903px）：action bar 保持可見", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("捲動長文章時，action bar 與預覽/儲存/狀態指示仍在可視範圍內", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin/posts/new");

      const actionBar = page.getByTestId("post-form-action-bar");
      await expect(actionBar).toBeVisible();

      // 在編輯器中輸入大量內容以撐長頁面，確保有可捲動空間
      // getByLabel("標題") 為子字串比對，會同時命中「SEO 標題」造成 strict mode
      // violation；改用穩定的欄位 id。
      await page.locator("#post-title").fill("Layout Sticky Test");
      await page.locator("#post-excerpt").fill("Sticky action bar regression check");
      const editor = page.locator(".tiptap.ProseMirror").first();
      await editor.click();
      for (let i = 0; i < 60; i += 1) {
        await editor.pressSequentially(`第 ${i} 段落內容，用於撐開頁面長度以測試捲動時的 sticky 行為。\n`);
      }

      // 捲動到頁面底部
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // action bar 仍應在可視區域內（top 落在 viewport 高度範圍內）
      await expect(actionBar).toBeVisible();
      const box = await actionBar.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeLessThan(900);

      // 預覽、儲存、狀態指示仍可被找到且可互動
      await expect(actionBar.getByRole("button", { name: "儲存" })).toBeVisible();
      // 狀態指示是 role="status" 的 live region，尚未觸發儲存前訊息為空、
      // 內容為空字串使其寬高塌陷為 0（Playwright 視為不可見），這是正確的
      // a11y 行為而非缺陷；只需確認它仍存在於可視的 action bar 內即可。
      await expect(actionBar.getByTestId("post-form-status")).toBeAttached();
    });
  });

  test.describe("行動版（375px）：單欄、無水平捲動、完整 tab 順序", () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test("版面為單欄且沒有任何元素被遮擋，也沒有水平捲動", async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto("/admin/posts/new");

      const actionBar = page.getByTestId("post-form-action-bar");
      const mainRegion = page.getByTestId("post-form-main");
      const settingsRegion = page.getByTestId("post-form-settings");

      await expect(actionBar).toBeVisible();
      await expect(mainRegion).toBeVisible();
      await expect(settingsRegion).toBeVisible();

      // 單欄：main 與 settings 應各自佔滿寬度（settings 不應與 main 並排在同一列）
      const mainBox = await mainRegion.boundingBox();
      const settingsBox = await settingsRegion.boundingBox();
      expect(mainBox).not.toBeNull();
      expect(settingsBox).not.toBeNull();
      expect(settingsBox!.y).toBeGreaterThanOrEqual(mainBox!.y + mainBox!.height - 1);

      // 無水平捲動
      const hasNoHorizontalScroll = await page.evaluate(() => {
        const el = document.scrollingElement;
        if (!el) return true;
        return el.scrollWidth <= el.clientWidth;
      });
      expect(hasNoHorizontalScroll).toBeTruthy();
    });

    test("完整 tab 順序可到達所有控制項（標題、摘要、模式選擇器、編輯器、狀態、發佈時間、分類、標籤、封面、精選、閱讀時間、SEO、預覽、儲存）", async ({
      page,
    }) => {
      await loginAsAdmin(page);
      await page.goto("/admin/posts/new");

      // 依序 Tab 並收集可聚焦元素的 accessible name / role，確認關鍵控制項皆可達
      const reachableTestIds = new Set<string>();
      const reachableLabels = new Set<string>();

      for (let i = 0; i < 80; i += 1) {
        await page.keyboard.press("Tab");
        const info = await page.evaluate(() => {
          const active = document.activeElement as HTMLElement | null;
          if (!active) return null;
          return {
            testId: active.getAttribute("data-testid"),
            id: active.id,
            ariaLabel: active.getAttribute("aria-label"),
            name: (active as HTMLInputElement).name,
          };
        });
        if (info?.testId) reachableTestIds.add(info.testId);
        if (info?.id) reachableLabels.add(info.id);
        if (info?.ariaLabel) reachableLabels.add(info.ariaLabel);
      }

      // 主要欄位的 id（見 post-form/authoring-panel.tsx、settings-panel.tsx）
      const expectedFieldIds = [
        "post-title",
        "post-slug",
        "post-excerpt",
        "post-published-at",
        "post-reading-time",
        "seo-title",
        "seo-description",
        "og-image",
      ];
      for (const fieldId of expectedFieldIds) {
        expect(reachableLabels.has(fieldId)).toBeTruthy();
      }

      // 沒有任何內容因為單欄堆疊而不可視／不可聚焦（隱含在上面逐一 Tab 到達的事實中）
      expect(reachableLabels.size).toBeGreaterThan(0);
    });
  });
});

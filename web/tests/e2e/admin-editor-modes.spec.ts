import { test, expect } from "@playwright/test";

// 輔助函數：登入（沿用 tests/e2e/admin-posts.spec.ts 的慣例）
// radio input 為 sr-only（視覺上隱藏，由外層 <label> 承接點擊），直接點擊
// input 會被自身的 <label> 攔截指標事件；改為點擊可視的 <label> 文字。
async function selectMode(page: any, label: "視覺編輯器" | "原始 HTML") {
  await page.getByRole("radiogroup", { name: "編輯模式" }).getByText(label, { exact: true }).click();
}

// 對應 openspec/changes/improve-post-authoring-and-raw-html-layout 任務 4.1/4.2、6.4、6.5：
// 這份 spec 在撰寫階段先不執行（write-only），將於 6.4/6.5 執行並修正整合問題。
test.describe("文章編輯器 authoring mode 選擇（鍵盤與無障礙）", () => {
  test("使用鍵盤在視覺編輯器／原始 HTML 之間切換模式", async ({ page }) => {
    await page.goto("/admin/posts/new");

    const radiogroup = page.getByRole("radiogroup", { name: "編輯模式" });
    await expect(radiogroup).toBeVisible();

    const visualOption = page.getByRole("radio", { name: "視覺編輯器" });
    const rawOption = page.getByRole("radio", { name: "原始 HTML" });

    // 預設為視覺編輯器，且互斥
    await expect(visualOption).toBeChecked();
    await expect(rawOption).not.toBeChecked();

    // 每個選項的 hit target 至少 44px 高（4.1）。boundingBox() 不會等待元素
    // 可見（不像 click() 有 actionability 等待），在較慢環境下可能於 label
    // 完成佈局前就量測到 null，讀成 0 而誤判為零高度（見 e2e-runner trap
    // sheet 診斷順序：先排除工具本身的時機效應，而非誤判為 app 邏輯錯誤）。
    const visualLabel = visualOption.locator("xpath=ancestor::label[1]");
    await visualLabel.waitFor({ state: "visible" });
    const visualBox = await visualLabel.boundingBox();
    expect(visualBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    // 鍵盤 Tab 到選項，方向鍵在選項間移動並切換
    await visualOption.focus();
    await expect(visualOption).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(rawOption).toBeFocused();
    await expect(rawOption).toBeChecked();
    await expect(visualOption).not.toBeChecked();

    // 切回視覺編輯器（原始 HTML 空內容 -> 視覺編輯器為非破壞性切換，不應跳出警告）
    await page.keyboard.press("ArrowLeft");
    await expect(visualOption).toBeFocused();
    await expect(visualOption).toBeChecked();
    await expect(page.getByTestId("mode-switch-warning")).toHaveCount(0);
  });

  test("原始 HTML 內容含區塊結構切回視覺編輯器時，鍵盤可完成警告的取消與確認", async ({
    page,
  }) => {
    await page.goto("/admin/posts/new");

    const rawOption = page.getByRole("radio", { name: "原始 HTML" });
    await selectMode(page, "原始 HTML");

    const rawEditor = page.getByTestId("raw-html-editor");
    await expect(rawEditor).toBeVisible();
    await rawEditor.fill('<div style="color:red">保留樣式的內容</div>');

    const visualOption = page.getByRole("radio", { name: "視覺編輯器" });
    await selectMode(page, "視覺編輯器");

    // 出現不可逆切換警告，且尚未真正切換（模式與內容不變）
    const warning = page.getByTestId("mode-switch-warning");
    await expect(warning).toBeVisible();
    await expect(rawOption).toBeChecked();
    await expect(rawEditor).toHaveValue('<div style="color:red">保留樣式的內容</div>');

    // 鍵盤操作：Tab 到取消按鈕並用 Enter 觸發，警告應消失、模式維持原始 HTML
    const cancelButton = warning.getByRole("button", { name: "取消" });
    await cancelButton.focus();
    await expect(cancelButton).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(warning).toHaveCount(0);
    await expect(rawOption).toBeChecked();
    await expect(rawEditor).toHaveValue('<div style="color:red">保留樣式的內容</div>');

    // 再次觸發警告，這次用鍵盤確認切換
    await selectMode(page, "視覺編輯器");
    await expect(warning).toBeVisible();
    const confirmButton = warning.getByRole("button", { name: "確認切換" });
    await confirmButton.focus();
    await page.keyboard.press("Enter");

    await expect(warning).toHaveCount(0);
    await expect(visualOption).toBeChecked();
    await expect(page.locator(".tiptap.ProseMirror").first()).toBeVisible();
  });

  test("模式狀態透過可存取名稱／狀態被宣告（accessible name/state）", async ({ page }) => {
    await page.goto("/admin/posts/new");

    const visualOption = page.getByRole("radio", { name: "視覺編輯器" });
    const rawOption = page.getByRole("radio", { name: "原始 HTML" });

    // native radio 的 checked 狀態直接透過可存取樹反映（無 aria-checked 屬性）
    await expect(visualOption).toBeChecked();

    await selectMode(page, "原始 HTML");
    await expect(rawOption).toBeChecked();
    await expect(visualOption).not.toBeChecked();

    // TipTap 內部的「視覺內容原始碼」與文章層級「原始 HTML」命名不衝突
    await selectMode(page, "視覺編輯器");
    const sourceViewButton = page.getByRole("button", { name: "視覺內容原始碼" });
    await expect(sourceViewButton).toBeVisible();
    await expect(page.getByRole("button", { name: "HTML", exact: true })).toHaveCount(0);
  });
});

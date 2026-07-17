import type { Page } from "@playwright/test";

/**
 * 導航後等待 React streaming Suspense segment 容器（`<div hidden id="S:*">`）
 * 被消化。Next 16／React 19 下該容器偶爾（多在 dev、冷啟首訪）不會被
 * completion script 移除而永久殘留；此時可見樹已由 client render 完成，
 * 殘留段只是 hidden 的重複 DOM，對使用者不可見，但會讓 strict locator
 * （getByTestId／getByLabel／#id）解析出兩個元素而卡死。
 *
 * 策略：等 settleTimeout 讓正常 swap 完成；逾時仍存在即視為 stuck，
 * 直接移除殘留容器（安全：兩種觀察到的型態中可見樹都已完整）。
 * 背景與重現：openspec/changes/upgrade-nextjs-16/evidence/stage-b.md §5.3。
 */
export async function gotoSettled(page: Page, path: string, settleTimeoutMs = 3000) {
  await page.goto(path);
  const stuck = page.locator('body > div[hidden][id^="S:"]');
  try {
    await stuck.first().waitFor({ state: "detached", timeout: settleTimeoutMs });
  } catch {
    await stuck.evaluateAll((els) => els.forEach((el) => el.remove()));
  }
}

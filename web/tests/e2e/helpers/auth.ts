import { expect, type Page } from "@playwright/test";
import path from "path";

export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@lin.blog";
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin";

/**
 * 共用 admin storageState 的絕對路徑。由 global-setup.ts 寫入，
 * playwright.config.ts 的 chromium-authed project 與需要手動 context 的
 * spec（如 admin-management.spec.ts）共用同一份檔案。
 */
export const AUTH_FILE = path.resolve(__dirname, "../.auth/user.json");

const LOGIN_TIMEOUT_MS = 15_000;

/**
 * 統一的 E2E 登入流程（所有 spec 與 global-setup 共用）。
 *
 * /login 的送出按鈕在 React 掛載完成前是 disabled（hydration gate，見
 * web/src/app/login/page.tsx）。先等按鈕 enabled 再填值，可保證 onSubmit
 * handler 已掛上，不會觸發原生表單送出而停在登入頁；填值後再確認 Email
 * 值穩定，才送出並等待 /admin。
 */
export async function login(
  page: Page,
  email: string,
  password: string,
  options: { timeout?: number } = {},
): Promise<void> {
  // 冷編譯場景（如 global-setup 暖機）可放寬預算；一般 spec 用預設 15s。
  const timeout = options.timeout ?? LOGIN_TIMEOUT_MS;

  await page.goto("/login");
  const submit = page.locator("button[type='submit']");
  await expect(submit).toBeEnabled({ timeout });

  const emailInput = page.locator("input[type='email'], input[name='email']");
  await emailInput.fill(email);
  await page.fill("input[type='password']", password);
  await expect(emailInput).toHaveValue(email);

  await submit.click();
  await page.waitForURL("**/admin**", { timeout });
}

export async function loginAsAdmin(page: Page, options: { timeout?: number } = {}): Promise<void> {
  await login(page, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, options);
}

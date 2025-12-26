import { test as base, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

/**
 * E2E 測試帳號設定
 * 可透過環境變數 E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD 覆蓋預設值
 */
const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@example.com";
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "admin123";

/**
 * 認證 Fixture
 *
 * 提供已登入狀態的測試環境
 */

// 認證狀態檔案路徑
const AUTH_FILE = path.join(__dirname, ".auth", "user.json");

// 擴展 test fixture，加入認證狀態
export const test = base.extend<{}, { authenticatedContext: void }>({
  authenticatedContext: [
    async ({ browser }, use) => {
      // 確保認證目錄存在
      const authDir = path.dirname(AUTH_FILE);
      if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true });
      }

      // 建立新的 context
      const context = await browser.newContext();
      const page = await context.newPage();

      // 執行登入
      await page.goto("/login");
      await page.fill('input[name="email"], input[type="email"]', E2E_ADMIN_EMAIL);
      await page.fill('input[type="password"]', E2E_ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // 等待登入完成（重導向到 admin）
      await page.waitForURL("**/admin**", { timeout: 10000 });

      // 儲存認證狀態
      await context.storageState({ path: AUTH_FILE });

      await context.close();
      await use();
    },
    { scope: "worker" },
  ],
});

/**
 * 使用已認證狀態的 test fixture
 */
export const authenticatedTest = base.extend({
  storageState: AUTH_FILE,
});

export { expect };

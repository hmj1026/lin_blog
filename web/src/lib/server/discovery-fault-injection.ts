import "server-only";
import { cookies } from "next/headers";

/**
 * Discovery 查詢的 E2E fault injection 開關（server-only）。
 *
 * 僅供 Playwright E2E 驗證 design.md D5 的 failure isolation：探索查詢拋錯時
 * 文章主內容仍可讀。雙重閘控（與 newsletter CAPTCHA 測試替身相同模式，見
 * `playwright.config.ts` webServer.env）：
 *
 * 1. 環境旗標 `DISCOVERY_FAULT_INJECTION=1` 且非 production 建置才啟用；
 *    旗標只設定在 Playwright 的 webServer.env，絕不寫入 .env 檔案。
 * 2. 啟用後仍須由單一請求攜帶 cookie `e2e-discovery-fault=1` 才觸發，
 *    避免影響同一個 dev server 上的其他 E2E 測試。
 */
const FAULT_COOKIE_NAME = "e2e-discovery-fault";

export async function isDiscoveryFaultInjected(): Promise<boolean> {
  if (process.env.DISCOVERY_FAULT_INJECTION !== "1") return false;
  if (process.env.NODE_ENV === "production") return false;

  try {
    const cookieStore = await cookies();
    return cookieStore.get(FAULT_COOKIE_NAME)?.value === "1";
  } catch {
    // request scope 之外（如 build 期）無 cookies 可讀：一律不注入。
    return false;
  }
}

/** 啟用且該請求要求注入時拋出例外，模擬 repository/查詢層失敗。 */
export async function throwIfDiscoveryFaultInjected(): Promise<void> {
  if (await isDiscoveryFaultInjected()) {
    throw new Error("E2E discovery fault injection: simulated repository failure");
  }
}

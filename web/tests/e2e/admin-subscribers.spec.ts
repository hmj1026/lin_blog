import { test, expect, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAsAdmin, login } from "./helpers/auth";
import { loadDatabaseUrl } from "./helpers/db";
import { gotoSettled } from "./helpers/streaming";

/**
 * E2E：後台訂閱者名單（唯讀）RBAC 與功能
 *
 * 對應 openspec/changes/add-reader-discovery-and-subscriptions 任務 9.6。
 *
 * 涵蓋：
 * - ADMIN：list/搜尋（姓名/Email）/分頁/日期顯示，且畫面沒有匯出/刪除/群發入口。
 * - EDITOR：頁面重導向（`/admin/subscribers` → `/admin`），畫面不得閃現訂閱者資料；
 *   直接 GET `/api/admin/subscribers` 回傳 403，body 不含姓名/Email/total。
 * - 匿名：頁面重導向至 `/login`；直接 GET API 回傳 401，body 不含姓名/Email/total。
 *
 * 資料種子策略：訂閱者建立會經過 newsletter 專用限流（design.md D4，process-local，
 * 每來源 10 分鐘 5 次），與 `newsletter-subscribe.spec.ts` 共用同一個
 * sourceKey（本地測試請求無 `x-forwarded-for`，一律正規化為 `"unknown"`）。
 * 為了不消耗該限流額度、避免跨檔案互相干擾，這裡改以 Prisma 直連同一顆
 * dev DB（web/.env 指向的 `DATABASE_URL`）建立/清理 `Subscriber` 列，
 * 完全繞過公開訂閱 API，符合「唯讀後台名單」的測試意圖。
 */

async function findRoleId(request: APIRequestContext, roleKey: string): Promise<string> {
  const res = await request.get("/api/roles");
  expect(res.ok(), `讀取角色列表失敗：${res.status()}`).toBeTruthy();
  const json = await res.json();
  const role = (json.data.roles as Array<{ id: string; key: string }>).find((r) => r.key === roleKey);
  if (!role) throw new Error(`找不到角色 ${roleKey}`);
  return role.id;
}

test.describe.configure({ mode: "serial" });

test.describe("admin-subscribers", () => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const searchableName = `E2E Subscriber Findable ${runId}`;
  const searchableEmail = `e2e-subscriber-findable-${runId}@example.com`;
  const otherBEmail = `e2e-subscriber-other-b-${runId}@example.com`;
  const seededEmails: string[] = [];
  let editorUserId = "";
  let editorEmail = "";
  const editorPassword = "e2e-editor-pw-123";

  const prisma = new PrismaClient({ datasourceUrl: loadDatabaseUrl() });

  test.beforeAll(async ({ browser }) => {
    // Pagination 在 totalPages <= 1 時會完全隱藏（web/src/components/pagination.tsx），
    // 因此不再依賴種滿 20+ 筆資料；下方分頁測試強制 URL 使用 `?pageSize=1`，
    // 無論種子資料筆數為何都能保證產生多頁。
    const rows = [
      { name: searchableName, email: searchableEmail },
      { name: `E2E Subscriber Other A ${runId}`, email: `e2e-subscriber-other-a-${runId}@example.com` },
      { name: `E2E Subscriber Other B ${runId}`, email: otherBEmail },
    ];
    for (const row of rows) {
      await prisma.subscriber.create({ data: row });
      seededEmails.push(row.email);
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    await loginAsAdmin(page);

    const editorRoleId = await findRoleId(page.request, "EDITOR");
    editorEmail = `e2e-subscribers-editor-${runId}@example.com`;
    const createRes = await page.request.post("/api/users", {
      data: { email: editorEmail, password: editorPassword, name: "E2E Editor", roleId: editorRoleId },
    });
    expect(createRes.ok(), `建立 EDITOR 測試帳號失敗：${createRes.status()}`).toBeTruthy();
    const created = await createRes.json();
    editorUserId = created.data.id;

    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    await prisma.subscriber.deleteMany({ where: { email: { in: seededEmails } } });
    await prisma.$disconnect();

    if (editorUserId) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await loginAsAdmin(page);
      await page.request.delete(`/api/users/${editorUserId}`);
      await context.close();
    }
  });

  test.describe("ADMIN", () => {
    // 這支 spec 屬於 chromium-authed project，page fixture 已帶共用 admin
    // storageState，不需要再各自呼叫 loginAsAdmin()。
    test("顯示訂閱者名單，含姓名/Email/建立時間，且沒有匯出/刪除/群發入口", async ({ page }) => {
      await gotoSettled(page, "/admin/subscribers");
      await expect(page.getByRole("heading", { name: "訂閱者名單" })).toBeVisible();
      await expect(page.getByText(searchableEmail)).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(searchableName)).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "建立時間" })).toBeVisible();
      const row = page.locator("tr", { hasText: searchableEmail });
      await expect(row.locator("td").nth(2)).not.toHaveText("");

      // Non-Goals：不得出現匯出／刪除／群發等寫入操作入口（依可存取名稱檢查）。
      const main = page.getByRole("main");
      for (const name of [/匯出/, /export/i, /刪除/, /delete/i, /群發/, /寄信/, /broadcast/i]) {
        await expect(main.getByRole("button", { name })).toHaveCount(0);
        await expect(main.getByRole("link", { name })).toHaveCount(0);
      }
    });

    test("依姓名/Email 搜尋，結果保留查詢條件", async ({ page }) => {
      await gotoSettled(page, "/admin/subscribers");
      const searchInput = page.getByLabel("搜尋姓名或 Email");
      await searchInput.fill(searchableEmail);
      await page.getByRole("button", { name: "搜尋" }).click();

      await expect(page.getByText(searchableEmail)).toBeVisible({ timeout: 15000 });
      await expect(searchInput).toHaveValue(searchableEmail);
    });

    test("分頁控制項保留 URL 查詢（第一頁上一頁不可操作）", async ({ page }) => {
      await gotoSettled(page, "/admin/subscribers?pageSize=1");
      await expect(page.getByText(otherBEmail)).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("上一頁", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: "上一頁" })).toHaveCount(0);
    });
  });

  test.describe("EDITOR（缺少 subscribers:view 權限）", () => {
    // 這支 spec 屬於 chromium-authed project，需明確清空 project 帶入的
    // admin storageState，再各自用 EDITOR 帳號登入，避免沿用 admin 身分。
    test.use({ storageState: { cookies: [], origins: [] } });

    test("開啟後台訂閱者頁面顯示 403 安全狀態，畫面不閃現訂閱者資料", async ({ page }) => {
      await login(page, editorEmail, editorPassword);

      await gotoSettled(page, "/admin/subscribers");
      await expect(page).toHaveURL(/\/admin\/subscribers/);
      await expect(page.getByRole("heading", { name: "無法存取此頁面" })).toBeVisible();
      await expect(page.getByText(searchableEmail)).toHaveCount(0);
    });

    test("直接呼叫 GET /api/admin/subscribers 回傳 403，body 不含姓名/Email/total", async ({ page }) => {
      await login(page, editorEmail, editorPassword);

      const res = await page.request.get("/api/admin/subscribers");
      expect(res.status()).toBe(403);
      const text = await res.text();
      expect(text).not.toContain(searchableEmail);
      expect(text).not.toContain(searchableName);
      expect(text).not.toMatch(/"total"/);
    });

    test("可讀彙總分析但看不到敏感事件稽核與系統管理入口", async ({ page }) => {
      await login(page, editorEmail, editorPassword);
      await page.setViewportSize({ width: 1024, height: 900 });
      await gotoSettled(page, "/admin/analytics/posts");

      await expect(page.getByRole("heading", { name: "文章統計" })).toBeVisible();
      await expect(page.getByRole("link", { name: "進階稽核" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "使用者管理" })).toHaveCount(0);
      await expect(page.getByRole("link", { name: "角色權限" })).toHaveCount(0);
      await expect(page.getByText("編輯", { exact: true })).toBeVisible();
    });
  });

  test.describe("匿名（未登入）", () => {
    // 這支 spec 屬於 chromium-authed project，需明確清空 project 帶入的
    // admin storageState，才能驗證真正未登入的匿名行為。
    test.use({ storageState: { cookies: [], origins: [] } });

    test("開啟後台訂閱者頁面被導向登入頁", async ({ page }) => {
      await gotoSettled(page, "/admin/subscribers");
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page.getByText(searchableEmail)).toHaveCount(0);
    });

    test("直接呼叫 GET /api/admin/subscribers 回傳 401，body 不含姓名/Email/total", async ({ page }) => {
      const res = await page.request.get("/api/admin/subscribers");
      expect(res.status()).toBe(401);
      const text = await res.text();
      expect(text).not.toContain(searchableEmail);
      expect(text).not.toContain(searchableName);
      expect(text).not.toMatch(/"total"/);
    });
  });
});

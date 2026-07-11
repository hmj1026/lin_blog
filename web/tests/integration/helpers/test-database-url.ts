/**
 * 整合測試資料庫連線字串解析。
 *
 * 優先使用 `TEST_DATABASE_URL`；未設定時，以開發環境 `DATABASE_URL` 的
 * host/port/帳密為基礎，僅將資料庫名稱換成 `lin_blog_test`，並附加
 * `connection_limit=1`（整合測試序列執行，單一連線足夠且可避免連線池
 * 在多個測試檔之間互搶連線）。
 *
 * 刻意不重用開發用資料庫名稱，避免任何整合測試意外寫入/清空 `lin_blog`
 * 開發資料。
 */
export const TEST_DATABASE_NAME = "lin_blog_test";

export function resolveTestDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;

  const devUrl = process.env.DATABASE_URL;
  if (!devUrl) {
    throw new Error(
      "整合測試需要 TEST_DATABASE_URL 或 DATABASE_URL 其中之一，兩者皆未設定。"
    );
  }

  const url = new URL(devUrl);
  url.pathname = `/${TEST_DATABASE_NAME}`;
  url.searchParams.set("connection_limit", "1");
  return url.toString();
}

/**
 * 將測試資料庫的連線字串 pathname 換成 postgres 維護用資料庫，
 * 供 `CREATE DATABASE IF NOT EXISTS` 之類的一次性維運操作使用。
 */
export function toMaintenanceDatabaseUrl(testDatabaseUrl: string): string {
  const url = new URL(testDatabaseUrl);
  url.pathname = "/postgres";
  return url.toString();
}

import { resolveTestDatabaseUrl } from "./helpers/test-database-url";

/**
 * 每個整合測試檔案（同一個 process）執行前設定 `DATABASE_URL` 指向
 * 測試專用資料庫。必須在任何 import `@/lib/db`（進而建立 `PrismaClient`）
 * 的模組載入之前完成，`PrismaClient` 會在建構時讀取 `DATABASE_URL`。
 *
 * 這與 `global-setup.ts` 分屬不同 process：globalSetup 只負責一次性的
 * 建庫與 migrate，這裡才是真正讓測試 process 內的 Prisma client 連到
 * 測試庫的地方。
 */
process.env.DATABASE_URL = resolveTestDatabaseUrl();

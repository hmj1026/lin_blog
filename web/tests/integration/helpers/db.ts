import { PrismaClient } from "@prisma/client";
import { resolveTestDatabaseUrl } from "./test-database-url";

/**
 * 建立一個明確綁定到整合測試資料庫的 PrismaClient。
 *
 * 不依賴 `@/lib/db` 的全域單例，避免測試與（未來可能存在的）app 層
 * 共用同一個 client 實例造成生命週期耦合；每個測試檔自行建立、自行
 * `$disconnect()`。
 */
export function createTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: resolveTestDatabaseUrl() } },
  });
}

/**
 * 清空測試資料庫所有 public schema 資料表（`_prisma_migrations` 除外），
 * 並重設自增序號，讓每個測試檔案都從乾淨狀態開始。
 */
export async function truncateAll(client: PrismaClient): Promise<void> {
  const tables = await client.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'`
  );

  if (tables.length === 0) return;

  const tableList = tables.map((t) => `"${t.tablename}"`).join(", ");
  await client.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

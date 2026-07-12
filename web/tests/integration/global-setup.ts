import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { resolveTestDatabaseUrl, toMaintenanceDatabaseUrl } from "./helpers/test-database-url";

/**
 * Vitest globalSetup：整個整合測試執行只跑一次，且在獨立的 process 中執行
 * （因此這裡對 `process.env` 的修改不會傳遞到各測試檔案的 process；每個
 * 測試檔仍須自行在 `setupFiles` 內設定 `DATABASE_URL`）。
 *
 * 1. 若 `lin_blog_test` 資料庫不存在則建立。
 * 2. 對該資料庫執行 `prisma migrate deploy`，套用與開發庫相同的 schema。
 */
export default async function globalSetup() {
  const testDatabaseUrl = resolveTestDatabaseUrl();
  await ensureTestDatabaseExists(testDatabaseUrl);
  runMigrations(testDatabaseUrl);
}

async function ensureTestDatabaseExists(testDatabaseUrl: string): Promise<void> {
  const maintenanceUrl = toMaintenanceDatabaseUrl(testDatabaseUrl);
  const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");

  const maintenanceClient = new PrismaClient({
    datasources: { db: { url: maintenanceUrl } },
  });

  try {
    await maintenanceClient.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const alreadyExists = message.includes("already exists");
    if (!alreadyExists) throw error;
  } finally {
    await maintenanceClient.$disconnect();
  }
}

function runMigrations(testDatabaseUrl: string): void {
  execSync("npx prisma migrate deploy", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });
}

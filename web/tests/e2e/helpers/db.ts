import fs from "fs";
import path from "path";

/** 直連 DB，供多個 E2E spec 建立／清理 Subscriber，避免消耗 newsletter 限流額度。 */
export function loadDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.resolve(__dirname, "../../../.env");
  const content = fs.readFileSync(envPath, "utf-8");
  const match = content.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?\s*$/m);
  if (!match) {
    throw new Error("找不到 DATABASE_URL，無法直連 dev DB 建立測試用訂閱者資料");
  }
  return match[1];
}

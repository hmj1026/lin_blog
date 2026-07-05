/**
 * 動態 id 片段的判斷規則：
 * - 純數字（例如 `/api/posts/123`）
 * - Prisma `@default(cuid())` 格式（例如 `clv0abcd1234abcd5678efgh9`）
 * - UUID v4-ish 格式（例如 `550e8400-e29b-41d4-a716-446655440000`）
 */
const NUMERIC_ID_PATTERN = /^\d+$/;
const CUID_PATTERN = /^c[a-z0-9]{24}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 將路徑中的動態 id 片段正規化為 `:id`，藉此把 `/api/posts/123` 與
 * `/api/posts/456` 等實際上打向同一個路由的請求歸類到相同的 rate limit
 * 分桶，避免使用者藉由變換 id 繞過流量限制。
 *
 * 靜態片段（如 `api`、`posts`、`comments`）維持原樣不變。
 *
 * @param pathname 原始請求路徑，例如 `/api/posts/123`
 * @returns 正規化後的路由樣式，例如 `/api/posts/:id`
 */
export function normalizeRoutePattern(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => {
      if (
        NUMERIC_ID_PATTERN.test(segment) ||
        CUID_PATTERN.test(segment) ||
        UUID_PATTERN.test(segment)
      ) {
        return ":id";
      }
      return segment;
    })
    .join("/");
}

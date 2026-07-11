import { toPublicPostSummary } from "./dto";
import type { DiscoveryAnalyticsPort, DiscoveryPostsPort, PostSourceRecord } from "./ports";

export type DiscoveryUseCases = ReturnType<typeof createDiscoveryUseCases>;

const SEARCH_DEFAULT_PAGE_SIZE = 10;
const SEARCH_MAX_PAGE_SIZE = 20;
const SEARCH_MIN_PAGE = 1;
/**
 * 頁碼上限：頁碼由使用者控制且會化為 `skip = (page - 1) * pageSize`，設定合理上限
 * 避免以極大頁碼產生天文數字 OFFSET（防禦性上界；正常分頁遠低於此）。
 */
const SEARCH_MAX_PAGE = 10000;

const POPULAR_WINDOW_DAYS = 30;
const POPULAR_MAX = 5;
const LATEST_MAX = 5;
/**
 * 熱門文章不足 5 篇時，向最新文章埠多要一些筆數，確保扣除與熱門文章
 * 重複（最多 POPULAR_MAX 筆）後仍有足夠筆數可補到 POPULAR_MAX。
 */
const LATEST_FALLBACK_FETCH = POPULAR_MAX * 2;

/** 將數值夾限在 [min, max] 區間，非有限數字時退回 min。 */
function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * 建立公開文章探索模組的 Use Cases。
 *
 * 本模組只讀取既有文章／analytics 資料並映射為公開安全 DTO，不持有任何
 * 寫入邏輯，亦不直接依賴 Prisma；資料存取一律經由注入的 ports。
 *
 * @param deps - 依賴的讀取 ports
 */
export function createDiscoveryUseCases(deps: { posts: DiscoveryPostsPort; analytics: DiscoveryAnalyticsPort }) {
  return {
    /**
     * 公開站內搜尋。
     *
     * 查詢字串經 trim；空白查詢不呼叫 repository，直接回傳 `empty-query`
     * 結果，避免探索模組意外列出全部文章。頁碼與每頁筆數有界（page >= 1，
     * 1 <= pageSize <= 20，預設 10）。
     */
    searchPublicPosts: async (params: { query: string; page?: number; pageSize?: number }) => {
      const trimmed = params.query.trim();
      if (trimmed === "") {
        return { kind: "empty-query" as const, query: trimmed };
      }

      const page = clampInt(params.page ?? SEARCH_MIN_PAGE, SEARCH_MIN_PAGE, SEARCH_MAX_PAGE);
      const pageSize = clampInt(params.pageSize ?? SEARCH_DEFAULT_PAGE_SIZE, 1, SEARCH_MAX_PAGE_SIZE);

      const result = await deps.posts.searchPublished({ query: trimmed, page, pageSize });

      return {
        kind: "results" as const,
        query: trimmed,
        page,
        pageSize,
        total: result.total,
        items: result.items.map(toPublicPostSummary),
      };
    },

    /**
     * 公開熱門文章排行。
     *
     * 以 `now`（可注入以利測試）往前 30 日為視窗，取最多 5 篇已發佈且未
     * 刪除文章；不足 5 篇時，以最新文章依 id 去重補足，且補足後仍不超過
     * 5 篇上限。
     */
    listPopularPosts: async (params?: { now?: Date }) => {
      const now = params?.now ?? new Date();
      const since = new Date(now.getTime() - POPULAR_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      const popular = await deps.analytics.listPopularPublishedSince({ since, until: now, take: POPULAR_MAX });
      const remaining = POPULAR_MAX - popular.length;

      if (remaining <= 0) {
        return popular.slice(0, POPULAR_MAX).map(toPublicPostSummary);
      }

      const latest = await deps.posts.listLatestPublished({ take: LATEST_FALLBACK_FETCH, asOf: now });
      const seenIds = new Set(popular.map((post) => post.id));
      const fill: PostSourceRecord[] = [];

      for (const post of latest) {
        if (fill.length >= remaining) break;
        if (seenIds.has(post.id)) continue;
        seenIds.add(post.id);
        fill.push(post);
      }

      return [...popular, ...fill].map(toPublicPostSummary);
    },

    /**
     * 公開最新文章列表。
     *
     * 最多 5 篇已發佈且未刪除文章，依 publishedAt DESC、id 決勝排序
     * （排序契約由 `DiscoveryPostsPort` 實作保證）。
     */
    listLatestPosts: async () => {
      const latest = await deps.posts.listLatestPublished({ take: LATEST_MAX, asOf: new Date() });
      return latest.slice(0, LATEST_MAX).map(toPublicPostSummary);
    },
  };
}

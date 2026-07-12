/**
 * 探索模組（搜尋／訂閱／熱門／最新）共用的展示層 view model。
 *
 * 刻意不直接依賴 `@/lib/server-queries` 的型別，改以結構相容的方式接受
 * discoveryQueries 的回傳結果，避免展示元件耦合到 server-only 的讀取門面。
 */

/** 探索模組使用的最小公開文章摘要（與 discoveryQueries 回傳的 DTO 結構相容） */
export type DiscoveryPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string | null;
  category: string | null;
};

/** 每個探索清單模組（熱門／最新）最多顯示的筆數 */
export const DISCOVERY_SECTION_MAX_ITEMS = 5;

/**
 * 探索清單模組的展示狀態：內容 / 空狀態 / 泛化錯誤狀態。
 * 對應 design.md D5：探索查詢失敗不得讓文章頁整體失敗，只影響對應模組。
 */
export type DiscoverySectionState =
  | { status: "content"; items: readonly DiscoveryPostSummary[] }
  | { status: "empty" }
  | { status: "error" };

/** discoveryQueries.listPopularPosts / listLatestPosts 回傳結果的結構相容輸入 */
export type DiscoveryListLikeResult = {
  ok: boolean;
  items: readonly DiscoveryPostSummary[];
};

/**
 * 將 discoveryQueries 的清單結果映射為展示狀態，並套用每模組最大筆數上限。
 */
export function toDiscoverySectionState(result: DiscoveryListLikeResult): DiscoverySectionState {
  if (!result.ok) return { status: "error" };
  if (result.items.length === 0) return { status: "empty" };
  return { status: "content", items: result.items.slice(0, DISCOVERY_SECTION_MAX_ITEMS) };
}

/**
 * discovery 模組讀取用的文章來源紀錄。
 *
 * 僅供 application 層內部使用（排序、去重、決勝欄位），最終一律經
 * `toPublicPostSummary` 映射為公開 DTO 後才會離開本模組；`id` 等欄位
 * 不得直接暴露給呼叫端。
 */
export type PostSourceRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: Date | null;
  category: string | null;
};

export type SearchResult = {
  items: PostSourceRecord[];
  total: number;
};

/**
 * 公開文章搜尋／最新文章讀取埠。
 *
 * 實作（infrastructure adapter）必須只回傳已發佈且未刪除的文章，並以
 * `publishedAt DESC`、`id` 為決勝排序維持穩定分頁。
 */
export interface DiscoveryPostsPort {
  /** 以已 trim 的 query 比對標題／摘要；page/pageSize 已由 use case 夾限。 */
  searchPublished(params: { query: string; page: number; pageSize: number }): Promise<SearchResult>;
  /** 取得 asOf 時已發佈的最新文章，依 publishedAt DESC、id 決勝排序。 */
  listLatestPublished(params: { take: number; asOf: Date }): Promise<PostSourceRecord[]>;
}

/**
 * 公開熱門文章讀取埠。
 *
 * 實作必須只回傳最近 `since` 起算內具有效瀏覽事件、且仍為已發佈未刪除的
 * 文章，依 `viewCount DESC`、`publishedAt DESC`、`id` 決勝排序；不得暴露
 * 個別訪客事件資料。
 */
export interface DiscoveryAnalyticsPort {
  listPopularPublishedSince(params: { since: Date; until: Date; take: number }): Promise<PostSourceRecord[]>;
}

import "server-only";

import { cache as reactCache } from "react";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { isReadablePost } from "@/modules/posts/domain";
import { analyticsUseCases } from "@/modules/analytics";
import { mediaUseCases } from "@/modules/media";
import { securityAdminUseCases } from "@/modules/security-admin";
import { discoveryUseCases } from "@/modules/discovery";
import type { PublicPostSummary } from "@/modules/discovery";
import { newsletterUseCases } from "@/modules/newsletter";
import { auditUseCases } from "@/modules/audit";
import { throwIfDiscoveryFaultInjected } from "@/lib/server/discovery-fault-injection";

const NO_PARAMS_KEY = "__no-params__";

type CacheFn = <Args extends unknown[], Result>(fn: (...args: Args) => Result) => (...args: Args) => Result;

const fallbackCache: CacheFn = (fn) => fn;
const cacheFn: CacheFn = typeof reactCache === "function"
  ? (reactCache as CacheFn)
  : fallbackCache;

/**
 * Normalize params with stable ordering to keep cache keys consistent.
 */
function normalizeForKey(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForKey);
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    const result: Record<string, unknown> = {};
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record).sort()) {
      result[key] = normalizeForKey(record[key]);
    }
    return result;
  }

  return value;
}

/**
 * Serialize params into a stable cache key.
 */
function toCacheKey(value?: unknown): string {
  if (value === undefined) return NO_PARAMS_KEY;
  return JSON.stringify(normalizeForKey(value));
}

/**
 * Restore params from a cache key.
 */
function fromCacheKey<T>(key: string): T | undefined {
  if (key === NO_PARAMS_KEY) return undefined;
  return JSON.parse(key) as T;
}

/**
 * Wrap optional object params with per-request dedupe cache.
 */
function cacheByOptionalObject<P, R>(fn: (params?: P) => Promise<R>) {
  const cached = cacheFn((key: string) => fn(fromCacheKey<P>(key)));
  return (params?: P) => cached(toCacheKey(params));
}

/**
 * Wrap object params with per-request dedupe cache.
 */
function cacheByObject<P, R>(fn: (params: P) => Promise<R>) {
  const cached = cacheFn((key: string) => fn(fromCacheKey<P>(key) as P));
  return (params: P) => cached(toCacheKey(params));
}

const listPublishedPosts = cacheByOptionalObject(postsUseCases.listPublishedPosts);
const listPublishedPostsPaginated = cacheByObject(postsUseCases.listPublishedPostsPaginated);
const searchPosts = cacheByObject(postsUseCases.searchPosts);
const listAdminPosts = cacheByObject((params: Parameters<typeof postsUseCases.listAdminPosts>[0]) => postsUseCases.listAdminPosts(params));
const countPublishedPosts = cacheFn(() => postsUseCases.countPublishedPosts());
const countActivePosts = cacheFn(() => postsUseCases.countActivePosts());
const countActiveCategories = cacheFn(() => postsUseCases.countActiveCategories());
const countActiveTags = cacheFn(() => postsUseCases.countActiveTags());
const listPublishedForSitemap = cacheFn(() => postsUseCases.listPublishedForSitemap());
const getPostBySlug = cacheFn((slug: string) => postsUseCases.getPostBySlug(slug));
const getPostById = cacheFn((id: string) => postsUseCases.getPostById(id));

/**
 * Reuse cached post reads and apply readable checks.
 */
const getReadablePostBySlug = cacheFn(async (key: string) => {
  const input = fromCacheKey<{ slug: string; allowDraft: boolean }>(key);
  if (!input) return null;

  const post = await getPostBySlug(input.slug);
  if (!post) return null;
  if (!isReadablePost({ status: post.status, deletedAt: post.deletedAt, publishedAt: post.publishedAt }, { allowDraft: input.allowDraft })) return null;
  return post;
});

/**
 * Build stable key for related post queries (only needed fields).
 */
function toRelatedKey(input: { post: { slug: string; categories: { id: string }[]; tags: { id: string }[] } }) {
  const categoryIds = input.post.categories.map((category) => category.id).sort();
  const tagIds = input.post.tags.map((tag) => tag.id).sort();

  return toCacheKey({
    slug: input.post.slug,
    categoryIds,
    tagIds,
  });
}

const listRelatedPublishedPosts = cacheFn(async (key: string) => {
  const params = fromCacheKey<{ slug: string; categoryIds: string[]; tagIds: string[] }>(key);
  if (!params) return [];

  return postsUseCases.listRelatedPublishedPosts({
    post: {
      slug: params.slug,
      categories: params.categoryIds.map((id) => ({ id })),
      tags: params.tagIds.map((id) => ({ id })),
    },
  });
});

const listActiveCategories = cacheByOptionalObject(postsUseCases.listActiveCategories);
const listAllCategories = cacheFn(() => postsUseCases.listAllCategories());
const getCategoryBySlug = cacheFn((slug: string) => postsUseCases.getCategoryBySlug(slug));
const listActiveTags = cacheFn(() => postsUseCases.listActiveTags());
const listAllTags = cacheFn(() => postsUseCases.listAllTags());
const findTagsBySlugOrName = cacheFn((value: string) => postsUseCases.findTagsBySlugOrName(value));
const listPostVersions = cacheFn((postId: string) => postsUseCases.listPostVersions(postId));
const getPostVersion = cacheFn((postId: string, versionId: string) => postsUseCases.getPostVersion(postId, versionId));
const exportPosts = cacheByObject((params: { ids?: string[] }) => postsUseCases.exportPosts(params));

/**
 * Posts read queries (per-request dedupe).
 */
export const postsQueries = {
  listPublishedPosts,
  listPublishedPostsPaginated,
  searchPosts,
  listAdminPosts,
  countPublishedPosts,
  countActivePosts,
  countActiveCategories,
  countActiveTags,
  listPublishedForSitemap,
  getPostBySlug,
  getPostById,
  getReadablePostBySlug: (input: { slug: string; allowDraft: boolean }) => getReadablePostBySlug(toCacheKey(input)),
  listRelatedPublishedPosts: (input: { post: { slug: string; categories: { id: string }[]; tags: { id: string }[] } }) =>
    listRelatedPublishedPosts(toRelatedKey(input)),
  listActiveCategories,
  listAllCategories,
  getCategoryBySlug,
  listActiveTags,
  listAllTags,
  findTagsBySlugOrName,
  listPostVersions,
  getPostVersion,
  exportPosts,
};

const getDefault = cacheFn(() => siteSettingsUseCases.getDefault());
const getOrCreateDefault = cacheFn(() => siteSettingsUseCases.getOrCreateDefault());

/**
 * Site settings read queries (per-request dedupe).
 */
export const siteSettingsQueries = {
  getDefault,
  getOrCreateDefault,
};

// --- Analytics read queries (per-request dedupe) ---
const getPostSummary = cacheFn((postId: string) => analyticsUseCases.getPostSummary(postId));
type PostAnalyticsSummaryParams = { days: number; categoryId?: string; tagId?: string; publishedFrom?: Date; publishedTo?: Date };
const listPostAnalyticsSummaryCached = cacheFn((key: string) => {
  const params = fromCacheKey<PostAnalyticsSummaryParams>(key)!;
  return analyticsUseCases.listPostAnalyticsSummary({
    ...params,
    publishedFrom: params.publishedFrom ? new Date(params.publishedFrom) : undefined,
    publishedTo: params.publishedTo ? new Date(params.publishedTo) : undefined,
  });
});
const listPostAnalyticsSummary = (params: PostAnalyticsSummaryParams) => listPostAnalyticsSummaryCached(toCacheKey(params));
const countViews = cacheByObject((params: { days: number }) => analyticsUseCases.countViews(params));
const getDashboardStats = cacheByObject((params: { days: number }) => analyticsUseCases.getDashboardStats(params));

type ListPostViewEventsParams = Parameters<typeof analyticsUseCases.listPostViewEvents>[0];

/**
 * listPostViewEvents 的 from/to 是 Date 物件；cache key 以 JSON 序列化會轉成字串，
 * 因此在還原時必須把 from/to 重新轉回 Date，維持與底層 use case 相同的型別語意。
 */
const listPostViewEventsCached = cacheFn((key: string) => {
  const p = fromCacheKey<ListPostViewEventsParams>(key)!;
  return analyticsUseCases.listPostViewEvents({
    ...p,
    from: p.from ? new Date(p.from) : undefined,
    to: p.to ? new Date(p.to) : undefined,
  });
});

/**
 * Analytics read queries (per-request dedupe).
 */
export const analyticsQueries = {
  getPostSummary,
  listPostAnalyticsSummary,
  countViews,
  getDashboardStats,
  listPostViewEvents: (params: ListPostViewEventsParams) => listPostViewEventsCached(toCacheKey(params)),
};

// --- Media read queries (per-request dedupe) ---
const listUploads = cacheByObject((params: { search?: string; type?: string; take?: number }) => mediaUseCases.listUploads(params));
const listUploadsPage = cacheByObject((params: { search?: string; type?: string; page?: number; pageSize?: number }) => mediaUseCases.listUploadsPage(params));
const getUploadById = cacheFn((id: string) => mediaUseCases.getUploadById(id));

/**
 * Media read queries (per-request dedupe).
 */
export const mediaQueries = {
  listUploads,
  listUploadsPage,
  getUploadById,
};

// --- Security-admin read queries (per-request dedupe) ---
const countActiveUsers = cacheFn(() => securityAdminUseCases.countActiveUsers());
const listUsers = cacheByOptionalObject((params?: { includeDeleted?: boolean }) => securityAdminUseCases.listUsers(params));
const listActiveRoles = cacheFn(() => securityAdminUseCases.listActiveRoles());
const listRolesAndPermissions = cacheFn(() => securityAdminUseCases.listRolesAndPermissions());

/**
 * Security-admin read queries (per-request dedupe).
 */
export const securityAdminQueries = {
  countActiveUsers,
  listUsers,
  listActiveRoles,
  listRolesAndPermissions,
};

// --- Discovery read queries (per-request dedupe, error-isolated) ---

/**
 * 公開搜尋結果；`kind: "error"` 是探索專用的泛化錯誤狀態（design.md D5：
 * 探索查詢失敗不得讓文章頁失敗），不攜帶內部錯誤細節。
 */
export type DiscoverySearchResult =
  | { kind: "empty-query"; query: string }
  | { kind: "results"; query: string; page: number; pageSize: number; total: number; items: readonly PublicPostSummary[] }
  | { kind: "error"; query: string };

/**
 * 熱門／最新文章列表的泛化結果；`ok: false` 時 `items` 一律為空陣列，
 * 呼叫端只需依 `ok` 決定要顯示清單還是泛化錯誤狀態，不需解讀底層錯誤。
 */
export type DiscoveryListResult = { ok: true; items: readonly PublicPostSummary[] } | { ok: false; items: readonly [] };

/**
 * 公開站內搜尋（error-isolated）。use case 拋出例外時回傳 `kind: "error"`，
 * 不重新拋出，避免探索模組的暫時性錯誤讓文章詳情頁整體失敗。
 */
const searchPublicPosts = cacheByObject(
  async (params: { query: string; page?: number; pageSize?: number }): Promise<DiscoverySearchResult> => {
    try {
      return await discoveryUseCases.searchPublicPosts(params);
    } catch {
      return { kind: "error", query: params.query };
    }
  }
);

/**
 * 公開熱門文章排行（error-isolated）。失敗時回傳 `{ ok: false, items: [] }`。
 */
const listPopularPosts = cacheFn(async (): Promise<DiscoveryListResult> => {
  try {
    await throwIfDiscoveryFaultInjected();
    const items = await discoveryUseCases.listPopularPosts();
    return { ok: true, items };
  } catch {
    return { ok: false, items: [] };
  }
});

/**
 * 公開最新文章列表（error-isolated）。失敗時回傳 `{ ok: false, items: [] }`。
 */
const listLatestPosts = cacheFn(async (): Promise<DiscoveryListResult> => {
  try {
    await throwIfDiscoveryFaultInjected();
    const items = await discoveryUseCases.listLatestPosts();
    return { ok: true, items };
  } catch {
    return { ok: false, items: [] };
  }
});

/**
 * Discovery 公開讀取查詢（per-request dedupe）。每個查詢皆與 use case 的
 * 例外隔離，探索資料暫時不可用時只影響對應模組，文章主內容不受影響。
 */
export const discoveryQueries = {
  searchPublicPosts,
  listPopularPosts,
  listLatestPosts,
};

// --- Newsletter read queries (per-request dedupe) ---
const listSubscribers = cacheByObject(
  (params: { search?: string; page?: number; pageSize?: number }) => newsletterUseCases.listSubscribers(params)
);
const countSubscriberGrowth = cacheFn(() => newsletterUseCases.countSubscriberGrowth());

/**
 * Newsletter read queries (per-request dedupe)。後台唯讀訂閱者名單，
 * 只回傳安全 DTO（id/name/email/createdAt），受 `subscribers:view` 權限保護。
 */
export const newsletterQueries = {
  listSubscribers,
  countSubscriberGrowth,
};

// --- Audit read queries (per-request dedupe) ---
type AuditListParams = { page?: number; pageSize?: number; since?: Date; until?: Date; actor?: string; resource?: string };
// cache key 以 JSON 序列化，Date 會退化為字串，故取回時重建為 Date（與 listPostAnalyticsSummary 同一模式）。
const listAuditEventsCached = cacheFn((key: string) => {
  const params = fromCacheKey<AuditListParams>(key)!;
  return auditUseCases.listAuditEvents({
    ...params,
    since: params.since ? new Date(params.since) : undefined,
    until: params.until ? new Date(params.until) : undefined,
  });
});
const listAuditEvents = (params: AuditListParams) => listAuditEventsCached(toCacheKey(params));

/**
 * Audit read queries (per-request dedupe)。後台活動紀錄，受 `audit:view` 權限保護。
 */
export const auditQueries = {
  listAuditEvents,
};

import { isPostStatus, type PostStatus } from "../domain";
import type { AdminPostListParams, AdminPostSort } from "./ports";

export type AdminPostListSearchParams = Record<string, string | string[] | undefined>;

const ADMIN_POST_SORTS = ["updated-desc", "created-desc", "published-desc", "title-asc"] as const;

/** 只採用單一 URL query 值，避免重複參數造成隱含優先序。 */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** 將數字 query 限制在明確範圍。 */
function boundedInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** 將後台文章列表 URL query 正規化為 repository 可安全使用的有界參數。 */
export function normalizeAdminPostListQuery(searchParams: AdminPostListSearchParams): AdminPostListParams {
  const statusValue = single(searchParams.status);
  const sortValue = single(searchParams.sort);
  const featuredValue = single(searchParams.featured);
  const query = single(searchParams.q)?.trim().slice(0, 100) || undefined;

  return {
    query,
    status: statusValue && isPostStatus(statusValue) ? (statusValue as PostStatus) : undefined,
    categoryId: single(searchParams.category)?.trim() || undefined,
    tagId: single(searchParams.tag)?.trim() || undefined,
    featured: featuredValue === "true" ? true : featuredValue === "false" ? false : undefined,
    deleted: single(searchParams.view) === "trash",
    sort: ADMIN_POST_SORTS.includes(sortValue as AdminPostSort) ? (sortValue as AdminPostSort) : "updated-desc",
    page: boundedInt(single(searchParams.page), 1, 1, 10_000),
    pageSize: boundedInt(single(searchParams.pageSize), 20, 1, 100),
  };
}

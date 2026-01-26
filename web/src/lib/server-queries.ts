import "server-only";

import { cache as reactCache } from "react";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { isReadablePost } from "@/modules/posts/domain";

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
const listAdminPosts = cacheFn(() => postsUseCases.listAdminPosts());
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
  if (!isReadablePost({ status: post.status, deletedAt: post.deletedAt }, { allowDraft: input.allowDraft })) return null;
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

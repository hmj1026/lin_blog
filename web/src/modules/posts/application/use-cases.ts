import type { z } from "zod";
import { sanitizePostHtml } from "@/lib/utils/sanitize";
import { postSchema } from "@/lib/validations/post.schema";
import { categorySchema } from "@/lib/validations/category.schema";
import { tagSchema } from "@/lib/validations/tag.schema";
import { isPostStatus, isReadablePost, normalizeSlug } from "../domain";
import type { CategoryRepository, PostRepository, PostVersionRepository, TagRepository } from "./ports";

export type PostsUseCases = ReturnType<typeof createPostsUseCases>;

/**
 * 建立文章模組的 Use Cases
 * 包含文章、分類、標籤的管理邏輯
 * 
 * @param deps - 依賴的 Repositories
 */
export function createPostsUseCases(deps: {
  posts: PostRepository;
  versions: PostVersionRepository;
  categories: CategoryRepository;
  tags: TagRepository;
}) {
  async function saveCurrentPostVersion(params: { postId: string; editorId?: string | null }) {
    const currentPost = await deps.posts.getById(params.postId);
    if (!currentPost) return null;
    return deps.versions.create({
      postId: params.postId,
      title: currentPost.title,
      excerpt: currentPost.excerpt,
      content: currentPost.content,
      editorId: params.editorId ?? null,
    });
  }

  return {
    /**
     * 取得已發布的文章列表
     */
    listPublishedPosts: (params?: { categorySlug?: string; tag?: string; featured?: boolean; take?: number }) =>
      deps.posts.listPublished(params),
    /**
     * 取得分頁後的已發布文章列表
     */
    listPublishedPostsPaginated: (params: { page: number; pageSize: number; categorySlug?: string; tag?: string }) =>
      deps.posts.listPublishedPaginated(params),
    /**
     * 搜尋文章
     */
    searchPosts: (params: { query: string; take?: number }) => deps.posts.search(params),
    /**
     * 取得後台管理用的文章列表
     */
    listAdminPosts: () => deps.posts.listForAdmin(),
    countPublishedPosts: () => deps.posts.countPublished(),
    countActivePosts: () => deps.posts.countActive(),
    countActiveCategories: () => deps.categories.countActive(),
    countActiveTags: () => deps.tags.countActive(),
    listPublishedForSitemap: () => deps.posts.listPublishedForSitemap(),
    getPostBySlug: (slug: string) => deps.posts.getBySlug(slug),
    getPostById: (id: string) => deps.posts.getById(id),
    /**
     * 取得可閱讀的文章 (已發布或草稿但允許預覽)
     */
    getReadablePostBySlug: async (input: { slug: string; allowDraft: boolean }) => {
      const post = await deps.posts.getBySlug(input.slug);
      if (!post) return null;
      if (!isReadablePost({ status: post.status, deletedAt: post.deletedAt }, { allowDraft: input.allowDraft })) return null;
      return post;
    },
    listRelatedPublishedPosts: async (input: { post: { slug: string; categories: { id: string }[]; tags: { id: string }[] } }) =>
      deps.posts.listRelated({
        excludeSlug: input.post.slug,
        categoryIds: input.post.categories.map((c) => c.id),
        tagIds: input.post.tags.map((t) => t.id),
        take: 3,
      }),
    listActiveCategories: (params?: { showInNav?: boolean }) => deps.categories.listActive(params),
    listAllCategories: () => deps.categories.listAll(),
    getCategoryBySlug: (slug: string) => deps.categories.getBySlug(slug),
    listActiveTags: () => deps.tags.listActive(),
    listAllTags: () => deps.tags.listAll(),
    findTagsBySlugOrName: (value: string) => deps.tags.findBySlugOrName(value),
    /**
     * 建立新文章
     */
    createPost: async (payload: z.infer<typeof postSchema>) => {
      const data = postSchema.parse(payload);
      return deps.posts.create({
        slug: normalizeSlug(data.slug),
        title: data.title,
        excerpt: data.excerpt,
        content: sanitizePostHtml(data.content),
        coverImage: data.coverImage,
        readingTime: data.readingTime,
        featured: data.featured ?? false,
        status: data.status ?? "DRAFT",
        publishedAt: data.publishedAt,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ogImage: data.ogImage ?? null,
        authorId: data.authorId,
        categoryIds: data.categoryIds ?? [],
        tagIds: data.tagIds ?? [],
      });
    },
    /**
     * 更新文章
     */
    updatePost: async (id: string, payload: z.infer<typeof postSchema>) => {
      const data = postSchema.parse(payload);
      return deps.posts.update(id, {
        slug: normalizeSlug(data.slug),
        title: data.title,
        excerpt: data.excerpt,
        content: sanitizePostHtml(data.content),
        coverImage: data.coverImage,
        readingTime: data.readingTime,
        featured: data.featured ?? false,
        status: data.status ?? "DRAFT",
        publishedAt: data.publishedAt,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ogImage: data.ogImage ?? null,
        authorId: data.authorId,
        categoryIds: data.categoryIds ?? null,
        tagIds: data.tagIds ?? null,
      });
    },
    /**
     * 更新文章並建立新版本
     */
    updatePostWithVersion: async (id: string, payload: z.infer<typeof postSchema>, editorId?: string | null) => {
      const data = postSchema.parse(payload);
      await saveCurrentPostVersion({ postId: id, editorId });
      return deps.posts.update(id, {
        slug: normalizeSlug(data.slug),
        title: data.title,
        excerpt: data.excerpt,
        content: sanitizePostHtml(data.content),
        coverImage: data.coverImage,
        readingTime: data.readingTime,
        featured: data.featured ?? false,
        status: data.status ?? "DRAFT",
        publishedAt: data.publishedAt,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ogImage: data.ogImage ?? null,
        authorId: data.authorId,
        categoryIds: data.categoryIds ?? null,
        tagIds: data.tagIds ?? null,
      });
    },
    removePost: (id: string) => deps.posts.softDelete(id),
    listPostVersions: async (postId: string) => {
      const post = await deps.posts.getById(postId);
      if (!post) return null;
      const versions = await deps.versions.listByPostId(postId);
      return { post: { id: post.id, title: post.title }, versions };
    },
    getPostVersion: (postId: string, versionId: string) => deps.versions.getById({ postId, versionId }),
    restorePostVersion: async (postId: string, versionId: string, editorId?: string | null) => {
      const version = await deps.versions.getById({ postId, versionId });
      if (!version) return { ok: false as const, error: "version-not-found" as const };

      const post = await deps.posts.getById(postId);
      if (!post) return { ok: false as const, error: "post-not-found" as const };

      await deps.versions.create({
        postId,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        editorId: editorId ?? null,
      });

      await deps.posts.update(postId, {
        slug: post.slug,
        title: version.title,
        excerpt: version.excerpt,
        content: version.content,
        coverImage: post.coverImage,
        readingTime: post.readingTime,
        featured: post.featured,
        status: post.status,
        publishedAt: post.publishedAt,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        ogImage: post.ogImage,
        categoryIds: null,
        tagIds: null,
      });

      return { ok: true as const };
    },

    batchPostAction: (params: { action: "publish" | "draft" | "delete"; postIds: string[] }) => deps.posts.batchAction(params),

    publishScheduledPosts: (now = new Date()) => deps.posts.publishDueScheduled(now),

    exportPosts: (params: { ids?: string[] }) => deps.posts.listForExport({ ids: params.ids, orderBy: "createdAtDesc" }),

    importPosts: async (params: {
      posts: Array<{
        slug: string;
        title: string;
        excerpt: string;
        content: string;
        coverImage?: string | null;
        readingTime?: string | null;
        featured?: boolean;
        status?: string;
        publishedAt?: string | null;
        seoTitle?: string | null;
        seoDescription?: string | null;
        ogImage?: string | null;
      }>;
      mode?: "skip" | "overwrite";
    }) => {
      const mode = params.mode ?? "skip";
      const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

      for (const p of params.posts) {
        try {
          if (!p.slug || !p.title || !p.excerpt || !p.content) {
            results.errors.push(`文章缺少必要欄位: ${p.slug || p.title || "unknown"}`);
            continue;
          }

          const slug = normalizeSlug(p.slug);
          const existing = await deps.posts.getBySlug(slug);
          const status = p.status && isPostStatus(p.status) ? p.status : "DRAFT";
          const publishedAt = p.publishedAt ? new Date(p.publishedAt) : null;

          if (existing && existing.deletedAt === null) {
            if (mode === "skip") {
              results.skipped += 1;
              continue;
            }

            await deps.posts.update(existing.id, {
              slug,
              title: p.title,
              excerpt: p.excerpt,
              content: sanitizePostHtml(p.content),
              coverImage: p.coverImage ?? null,
              readingTime: p.readingTime ?? null,
              featured: p.featured ?? false,
              status,
              publishedAt,
              seoTitle: p.seoTitle ?? null,
              seoDescription: p.seoDescription ?? null,
              ogImage: p.ogImage ?? null,
              categoryIds: null,
              tagIds: null,
            });
            results.updated += 1;
            continue;
          }

          await deps.posts.create({
            slug,
            title: p.title,
            excerpt: p.excerpt,
            content: sanitizePostHtml(p.content),
            coverImage: p.coverImage ?? null,
            readingTime: p.readingTime ?? null,
            featured: p.featured ?? false,
            status,
            publishedAt,
            seoTitle: p.seoTitle ?? null,
            seoDescription: p.seoDescription ?? null,
            ogImage: p.ogImage ?? null,
            categoryIds: [],
            tagIds: [],
          });
          results.created += 1;
        } catch (error) {
          results.errors.push(`匯入 ${p.slug} 失敗: ${error instanceof Error ? error.message : "unknown"}`);
        }
      }

      return results;
    },
    createCategory: async (payload: z.infer<typeof categorySchema>) => {
      const data = categorySchema.parse(payload);
      return deps.categories.create(data);
    },
    updateCategory: async (id: string, payload: z.infer<typeof categorySchema>) => {
      const data = categorySchema.parse(payload);
      return deps.categories.update(id, data);
    },
    removeCategory: (id: string) => deps.categories.softDelete(id),
    createTag: async (payload: z.infer<typeof tagSchema>) => {
      const data = tagSchema.parse(payload);
      return deps.tags.create(data);
    },
    updateTag: async (id: string, payload: z.infer<typeof tagSchema>) => {
      const data = tagSchema.parse(payload);
      return deps.tags.update(id, data);
    },
    removeTag: (id: string) => deps.tags.softDelete(id),
  };
}

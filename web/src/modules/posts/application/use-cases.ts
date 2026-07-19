import type { z } from "zod";
import { sanitizeContentByMode } from "@/lib/content-pipeline";
import { postSchema, importPostSchema } from "@/lib/validations/post.schema";
import { categorySchema } from "@/lib/validations/category.schema";
import { tagSchema } from "@/lib/validations/tag.schema";
import { isPostStatus, isReadablePost, normalizeSlug } from "../domain";
import type { AdminPostListParams, CategoryRepository, PostRepository, PostVersionRepository, TagRepository } from "./ports";

export type PostsUseCases = ReturnType<typeof createPostsUseCases>;

/**
 * showRawHtmlToc 只在原始 HTML 模式下有意義；allowRawHtml 為 false 時強制歸零，
 * 避免兩個欄位在資料庫中互相分歧。
 */
function normalizeShowRawHtmlToc(allowRawHtml: boolean, showRawHtmlToc: boolean): boolean {
  return allowRawHtml ? showRawHtmlToc : false;
}

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
    listAdminPosts: (params: AdminPostListParams) => deps.posts.listForAdmin(params),
    
    /** 計算已發布文章總數 */
    countPublishedPosts: () => deps.posts.countPublished(),
    /** 計算活躍文章總數（含草稿） */
    countActivePosts: () => deps.posts.countActive(),
    /** 計算活躍分類總數 */
    countActiveCategories: () => deps.categories.countActive(),
    /** 計算活躍標籤總數 */
    countActiveTags: () => deps.tags.countActive(),
    
    /** 取得給 Sitemap 使用的已發布文章列表 */
    listPublishedForSitemap: () => deps.posts.listPublishedForSitemap(),
    
    /** 根據 Slug 取得文章 */
    getPostBySlug: (slug: string) => deps.posts.getBySlug(slug),
    /** 根據 ID 取得文章 */
    getPostById: (id: string) => deps.posts.getById(id),
    /**
     * 取得可閱讀的文章 (已發布或草稿但允許預覽)
     */
    getReadablePostBySlug: async (input: { slug: string; allowDraft: boolean }) => {
      const post = await deps.posts.getBySlug(input.slug);
      if (!post) return null;
      if (!isReadablePost({ status: post.status, deletedAt: post.deletedAt, publishedAt: post.publishedAt }, { allowDraft: input.allowDraft })) return null;
      return post;
    },
    listRelatedPublishedPosts: async (input: { post: { slug: string; categories: { id: string }[]; tags: { id: string }[] } }) =>
      deps.posts.listRelated({
        excludeSlug: input.post.slug,
        categoryIds: input.post.categories.map((c) => c.id),
        tagIds: input.post.tags.map((t) => t.id),
        take: 3,
      }),
      
    /** 取得活躍分類列表（有文章的分類） */
    listActiveCategories: (params?: { showInNav?: boolean }) => deps.categories.listActive(params),
    /** 取得所有分類列表 */
    listAllCategories: () => deps.categories.listAll(),
    /** 根據 Slug 取得分類 */
    getCategoryBySlug: (slug: string) => deps.categories.getBySlug(slug),
    
    /** 取得活躍標籤列表（有文章的標籤） */
    listActiveTags: () => deps.tags.listActive(),
    /** 取得所有標籤列表 */
    listAllTags: () => deps.tags.listAll(),
    /** 根據名稱或 Slug 搜尋標籤 */
    findTagsBySlugOrName: (value: string) => deps.tags.findBySlugOrName(value),
    /**
     * 建立新文章
     */
    createPost: async (payload: z.infer<typeof postSchema>) => {
      const data = postSchema.parse(payload);
      const allowRawHtml = data.allowRawHtml ?? false;
      const showRawHtmlToc = normalizeShowRawHtmlToc(allowRawHtml, data.showRawHtmlToc ?? false);
      return deps.posts.create({
        slug: normalizeSlug(data.slug),
        title: data.title,
        excerpt: data.excerpt,
        content: sanitizeContentByMode(data.content, allowRawHtml),
        allowRawHtml,
        showRawHtmlToc,
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
      const allowRawHtml = data.allowRawHtml ?? false;
      const showRawHtmlToc = normalizeShowRawHtmlToc(allowRawHtml, data.showRawHtmlToc ?? false);
      return deps.posts.update(id, {
        slug: normalizeSlug(data.slug),
        title: data.title,
        excerpt: data.excerpt,
        content: sanitizeContentByMode(data.content, allowRawHtml),
        allowRawHtml,
        showRawHtmlToc,
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
      const allowRawHtml = data.allowRawHtml ?? false;
      const showRawHtmlToc = normalizeShowRawHtmlToc(allowRawHtml, data.showRawHtmlToc ?? false);

      const current = await deps.posts.getById(id);
      if (!current) return { ok: false as const, reason: "not-found" as const };

      // 樂觀鎖 token：優先採用前端載入時的 updatedAt（偵測「你看到後他人已改」），
      // 未提供時退回目前資料庫值（僅保證原子性）。
      const expectedUpdatedAt = data.expectedUpdatedAt ?? current.updatedAt;

      return deps.posts.updateWithVersion({
        id,
        expectedUpdatedAt,
        version: {
          title: current.title,
          excerpt: current.excerpt,
          content: current.content,
          allowRawHtml: current.allowRawHtml,
          showRawHtmlToc: current.showRawHtmlToc,
          editorId,
        },
        update: {
          slug: normalizeSlug(data.slug),
          title: data.title,
          excerpt: data.excerpt,
          content: sanitizeContentByMode(data.content, allowRawHtml),
          allowRawHtml,
          showRawHtmlToc,
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
        },
      });
    },
    removePost: (id: string) => deps.posts.softDelete(id),
    restorePost: (id: string) => deps.posts.restore(id),
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

      // 原子地快照當前文章 + 還原到選定版本；並行更新導致 updatedAt 變動時回 conflict。
      const result = await deps.posts.updateWithVersion({
        id: postId,
        expectedUpdatedAt: post.updatedAt,
        version: {
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          allowRawHtml: post.allowRawHtml,
          showRawHtmlToc: post.showRawHtmlToc,
          editorId,
        },
        update: {
          slug: post.slug,
          title: version.title,
          excerpt: version.excerpt,
          content: version.content,
          allowRawHtml: version.allowRawHtml,
          showRawHtmlToc: normalizeShowRawHtmlToc(version.allowRawHtml, version.showRawHtmlToc),
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
        },
      });

      if (!result.ok) {
        return { ok: false as const, error: result.reason === "conflict" ? ("conflict" as const) : ("post-not-found" as const) };
      }
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
        allowRawHtml?: boolean;
        showRawHtmlToc?: boolean;
      }>;
      mode?: "skip" | "overwrite";
    }) => {
      const mode = params.mode ?? "skip";
      const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };

      for (const rawPost of params.posts) {
        // 逐篇嚴格驗證：非布林旗標/缺欄位一律回報 validation error，不做 truthy coercion 也不寫入。
        const parsed = importPostSchema.safeParse(rawPost);
        if (!parsed.success) {
          const label = (rawPost as { slug?: string; title?: string }).slug
            || (rawPost as { slug?: string; title?: string }).title
            || "unknown";
          results.errors.push(`文章驗證失敗: ${label} - ${parsed.error.errors[0]?.message ?? "invalid"}`);
          continue;
        }
        const p = parsed.data;

        try {
          const slug = normalizeSlug(p.slug);
          const existing = await deps.posts.getBySlug(slug);
          const status = p.status && isPostStatus(p.status) ? p.status : "DRAFT";
          const publishedAt = p.publishedAt ? new Date(p.publishedAt) : null;
          const allowRawHtml = p.allowRawHtml ?? false;
          const showRawHtmlToc = normalizeShowRawHtmlToc(allowRawHtml, p.showRawHtmlToc ?? false);

          if (existing && existing.deletedAt === null) {
            if (mode === "skip") {
              results.skipped += 1;
              continue;
            }

            await deps.posts.update(existing.id, {
              slug,
              title: p.title,
              excerpt: p.excerpt,
              content: sanitizeContentByMode(p.content, allowRawHtml),
              allowRawHtml,
              showRawHtmlToc,
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
            content: sanitizeContentByMode(p.content, allowRawHtml),
            allowRawHtml,
            showRawHtmlToc,
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
    getCategoryDeletionImpact: async (id: string) => ({
      affectedPosts: await deps.categories.countPostsByCategory(id),
    }),
    removeCategory: async (id: string) => {
      const affectedPosts = await deps.categories.countPostsByCategory(id);
      const removed = await deps.categories.softDelete(id);
      return { ...removed, affectedPosts };
    },
    restoreCategory: (id: string) => deps.categories.restore(id),
    mergeCategory: async (sourceId: string, targetId: string) => {
      if (sourceId === targetId) throw new Error("分類不能合併到自身");
      return await deps.categories.merge(sourceId, targetId);
    },
    createTag: async (payload: z.infer<typeof tagSchema>) => {
      const data = tagSchema.parse(payload);
      return deps.tags.create(data);
    },
    updateTag: async (id: string, payload: z.infer<typeof tagSchema>) => {
      const data = tagSchema.parse(payload);
      return deps.tags.update(id, data);
    },
    removeTag: (id: string) => deps.tags.softDelete(id),
    restoreTag: (id: string) => deps.tags.restore(id),
    mergeTag: async (sourceId: string, targetId: string) => {
      if (sourceId === targetId) throw new Error("標籤不能合併到自身");
      return await deps.tags.merge(sourceId, targetId);
    },
  };
}

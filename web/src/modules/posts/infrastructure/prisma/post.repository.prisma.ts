import { PostStatus } from "@prisma/client";
import type { PostRepository } from "../../application/ports";
import { prisma } from "@/lib/db";
import { publishTimeReached } from "@/lib/prisma/public-post-visibility";
import { assertReferencedMediaUsable, lockMediaReferencesShared } from "@/lib/media-reference-lock";
import { mapPostStatusFromPrisma, mapPostStatusToPrisma } from "./mappers";

// updateWithVersion 內用來觸發 transaction rollback 並回報結果的哨兵錯誤。
class VersionConflictError extends Error {}
class PostNotFoundError extends Error {}

/** 文章更新的純量欄位映射（不含 categories/tags 關聯——updateMany 不支援 nested relation 寫入）。 */
function toScalarUpdateData(data: {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  readingTime?: string | null;
  featured?: boolean;
  allowRawHtml?: boolean;
  showRawHtmlToc?: boolean;
  status: PostStatus;
  publishedAt?: Date | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  authorId?: string | null;
}) {
  return {
    slug: data.slug,
    title: data.title,
    excerpt: data.excerpt,
    content: data.content,
    coverImage: data.coverImage,
    readingTime: data.readingTime,
    featured: data.featured ?? false,
    allowRawHtml: data.allowRawHtml ?? false,
    showRawHtmlToc: data.showRawHtmlToc ?? false,
    status: mapPostStatusToPrisma(data.status),
    publishedAt: data.publishedAt,
    seoTitle: data.seoTitle ?? null,
    seoDescription: data.seoDescription ?? null,
    ogImage: data.ogImage ?? null,
    authorId: data.authorId ?? undefined,
  };
}

/**
 * 公開文章列表查詢的最大筆數上限，避免呼叫端未指定或誤傳過大 take 造成無界查詢。
 */
const MAX_LIST_TAKE = 100;

const postListItemSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  readingTime: true,
  featured: true,
  allowRawHtml: true,
  showRawHtmlToc: true,
  status: true,
  publishedAt: true,
  seoTitle: true,
  seoDescription: true,
  ogImage: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
      deletedAt: true,
    },
  },
  categories: {
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      showInNav: true,
      navOrder: true,
      deletedAt: true,
    },
  },
  tags: {
    select: {
      id: true,
      slug: true,
      name: true,
      deletedAt: true,
    },
  },
} as const;

export const postRepositoryPrisma: PostRepository = {
  async listPublished(params) {
    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        featured: params?.featured ?? undefined,
        deletedAt: null,
        ...publishTimeReached(new Date()),
        categories: params?.categorySlug ? { some: { slug: params.categorySlug } } : undefined,
        tags: params?.tag
          ? {
              some: {
                OR: [{ name: params.tag }, { slug: params.tag }],
              },
            }
          : undefined,
      },
      select: postListItemSelect,
      orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
      take: Math.max(1, Math.min(params?.take ?? MAX_LIST_TAKE, MAX_LIST_TAKE)),
    });
    return posts.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) }));
  },

  async listPublishedPaginated(params) {
    const { page, pageSize, categorySlug, tag } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      status: PostStatus.PUBLISHED,
      deletedAt: null,
      ...publishTimeReached(new Date()),
      categories: categorySlug ? { some: { slug: categorySlug } } : undefined,
      tags: tag
        ? {
            some: {
              OR: [{ name: tag }, { slug: tag }],
            },
          }
        : undefined,
    };

    const [data, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: postListItemSelect,
        orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
        skip,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      data: data.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },

  async search(params) {
    const { query, take = 20 } = params;
    const trimmed = query.trim();
    if (!trimmed) return [];

    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        AND: [
          publishTimeReached(new Date()),
          {
            OR: [
              { title: { contains: trimmed, mode: "insensitive" } },
              { excerpt: { contains: trimmed, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: postListItemSelect,
      orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
      take,
    });
    return posts.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) }));
  },
  async listForAdmin(params) {
    const page = Math.max(1, Math.min(params.page, 10_000));
    const pageSize = Math.max(1, Math.min(params.pageSize, 100));
    const query = params.query?.trim();
    const where = {
      deletedAt: params.deleted ? { not: null } : null,
      status: params.status ? mapPostStatusToPrisma(params.status) : undefined,
      featured: params.featured,
      categories: params.categoryId ? { some: { id: params.categoryId } } : undefined,
      tags: params.tagId ? { some: { id: params.tagId } } : undefined,
      OR: query ? [
        { title: { contains: query, mode: "insensitive" as const } },
        { slug: { contains: query, mode: "insensitive" as const } },
      ] : undefined,
    };
    const primaryOrderBy = params.sort === "title-asc"
      ? { title: "asc" as const }
      : params.sort === "created-desc"
        ? { createdAt: "desc" as const }
        : params.sort === "published-desc"
          ? { publishedAt: { sort: "desc" as const, nulls: "last" as const } }
          : { updatedAt: "desc" as const };
    const orderBy = [primaryOrderBy, { id: "desc" as const }];
    // eslint-disable-next-line prefer-const -- posts 在頁碼夾限重查時會被重新指派
    let [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        select: postListItemSelect,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.post.count({ where }),
    ]);
    // 請求頁碼可能超過刪除後縮減的總頁數（例如第 2 頁唯一一篇被刪），
    // 此時以實際最後一頁重查，避免回傳空列表且分頁元件無法導回。
    let effectivePage = page;
    const totalPages = Math.ceil(total / pageSize);
    if (posts.length === 0 && total > 0 && page > totalPages) {
      effectivePage = Math.max(1, totalPages);
      posts = await prisma.post.findMany({
        where,
        orderBy,
        select: postListItemSelect,
        skip: (effectivePage - 1) * pageSize,
        take: pageSize,
      });
    }
    return {
      data: posts.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) })),
      pagination: { page: effectivePage, pageSize, total, totalPages },
    };
  },
  async countPublished() {
    return prisma.post.count({
      where: { status: PostStatus.PUBLISHED, deletedAt: null, ...publishTimeReached(new Date()) },
    });
  },
  async countActive() {
    return prisma.post.count({ where: { deletedAt: null } });
  },
  async listPublishedForSitemap() {
    return prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED, deletedAt: null, ...publishTimeReached(new Date()) },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
    });
  },
  async getBySlug(slug) {
    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        categories: { select: { id: true, slug: true, name: true, description: true, showInNav: true, navOrder: true, deletedAt: true } },
        tags: true,
        author: true,
      },
    });
    if (!post || post.deletedAt) return null;
    return { ...post, status: mapPostStatusFromPrisma(post.status) };
  },
  async getById(id) {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        categories: { select: { id: true, slug: true, name: true, description: true, showInNav: true, navOrder: true, deletedAt: true } },
        tags: true,
        author: true,
      },
    });
    if (!post || post.deletedAt) return null;
    return { ...post, status: mapPostStatusFromPrisma(post.status) };
  },
  async listRelated(params) {
    const categoryIds = params.categoryIds.filter(Boolean);
    const tagIds = params.tagIds.filter(Boolean);
    const relatedOr = [
      ...(categoryIds.length ? [{ categories: { some: { id: { in: categoryIds } } } }] : []),
      ...(tagIds.length ? [{ tags: { some: { id: { in: tagIds } } } }] : []),
    ];
    const posts = await prisma.post.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        slug: { not: params.excludeSlug },
        AND: [
          publishTimeReached(new Date()),
          ...(relatedOr.length ? [{ OR: relatedOr }] : []),
        ],
      },
      select: postListItemSelect,
      orderBy: { publishedAt: { sort: "desc", nulls: "last" } },
      take: params.take,
    });
    return posts.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) }));
  },
  async create(data) {
    // 與媒體刪除方共享 advisory lock 互斥，避免在確認媒體無引用後、刪除前寫入新的引用。
    return prisma.$transaction(async (tx) => {
      await lockMediaReferencesShared(tx);
      // 取鎖後重驗：引用的媒體若已被（先行提交的）刪除交易軟刪除，須拒絕寫入。
      await assertReferencedMediaUsable(tx, [data.coverImage, data.ogImage, data.content]);
      return tx.post.create({
        data: {
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          coverImage: data.coverImage,
          readingTime: data.readingTime,
          featured: data.featured ?? false,
          allowRawHtml: data.allowRawHtml ?? false,
          showRawHtmlToc: data.showRawHtmlToc ?? false,
          status: mapPostStatusToPrisma(data.status),
          publishedAt: data.publishedAt,
          seoTitle: data.seoTitle ?? null,
          seoDescription: data.seoDescription ?? null,
          ogImage: data.ogImage ?? null,
          authorId: data.authorId ?? undefined,
          categories: { connect: data.categoryIds?.map((id) => ({ id })) ?? [] },
          tags: { connect: data.tagIds?.map((id) => ({ id })) ?? [] },
        },
        select: { id: true },
      });
    });
  },
  async update(id, data) {
    // 與媒體刪除方共享 advisory lock 互斥，避免在確認媒體無引用後、刪除前寫入新的引用。
    return prisma.$transaction(async (tx) => {
      await lockMediaReferencesShared(tx);
      // 取鎖後重驗：引用的媒體若已被（先行提交的）刪除交易軟刪除，須拒絕寫入。
      await assertReferencedMediaUsable(tx, [data.coverImage, data.ogImage, data.content]);
      return tx.post.update({
        where: { id },
        data: {
          ...toScalarUpdateData(data),
          categories: data.categoryIds ? { set: data.categoryIds.map((cid) => ({ id: cid })) } : undefined,
          tags: data.tagIds ? { set: data.tagIds.map((tid) => ({ id: tid })) } : undefined,
        },
        select: { id: true },
      });
    });
  },
  async updateWithVersion({ id, expectedUpdatedAt, version, update }) {
    try {
      let nextUpdatedAt: Date | null = null;
      await prisma.$transaction(async (tx) => {
        // 與媒體刪除方共享 advisory lock 互斥，避免在確認媒體無引用後、刪除前寫入新的引用。
        await lockMediaReferencesShared(tx);
        // 取鎖後重驗：引用的媒體若已被（先行提交的）刪除交易軟刪除，須拒絕寫入。
        await assertReferencedMediaUsable(tx, [update.coverImage, update.ogImage, update.content]);
        const existing = await tx.post.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
        if (!existing) throw new PostNotFoundError();

        // 1) 先在同一 transaction 內快照當前版本
        await tx.postVersion.create({
          data: {
            postId: id,
            title: version.title,
            excerpt: version.excerpt,
            content: version.content,
            allowRawHtml: version.allowRawHtml ?? false,
            showRawHtmlToc: version.showRawHtmlToc ?? false,
            editorId: version.editorId ?? null,
          },
        });

        // 2) 樂觀鎖更新純量欄位：僅當 updatedAt 未變更時才寫入；count === 0 表示他人已更新
        const result = await tx.post.updateMany({
          where: { id, updatedAt: expectedUpdatedAt, deletedAt: null },
          data: toScalarUpdateData(update),
        });
        if (result.count === 0) throw new VersionConflictError();

        // 3) 關聯欄位（updateMany 不支援），在樂觀鎖確認後於同一 transaction 內寫入
        if (update.categoryIds) {
          await tx.post.update({
            where: { id },
            data: { categories: { set: update.categoryIds.map((cid) => ({ id: cid })) } },
            select: { id: true },
          });
        }
        if (update.tagIds) {
          await tx.post.update({
            where: { id },
            data: { tags: { set: update.tagIds.map((tid) => ({ id: tid })) } },
            select: { id: true },
          });
        }

        const row = await tx.post.findUnique({ where: { id }, select: { updatedAt: true } });
        nextUpdatedAt = row?.updatedAt ?? null;
      });
      return { ok: true as const, id, updatedAt: nextUpdatedAt ?? new Date() };
    } catch (error) {
      if (error instanceof VersionConflictError) return { ok: false as const, reason: "conflict" as const };
      if (error instanceof PostNotFoundError) return { ok: false as const, reason: "not-found" as const };
      throw error;
    }
  },
  async softDelete(id) {
    return prisma.post.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  },
  async restore(id) {
    return prisma.post.update({ where: { id }, data: { deletedAt: null }, select: { id: true } });
  },

  async batchAction(params) {
    // 逐筆隔離：單筆資料庫更新失敗只讓該筆回報 failed，不使整批 reject，
    // 讓管理員能明確得知哪些成功、哪些失敗，而非整體 500 且已提交部分更新卻無從得知。
    const results = await Promise.all(params.postIds.map(async (id) => {
      try {
        const result = params.action === "publish"
          ? await prisma.post.updateMany({ where: { id, deletedAt: null, status: PostStatus.DRAFT }, data: { status: PostStatus.PUBLISHED } })
          : params.action === "draft"
            ? await prisma.post.updateMany({ where: { id, deletedAt: null, status: PostStatus.PUBLISHED }, data: { status: PostStatus.DRAFT } })
            : await prisma.post.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
        return result.count > 0
          ? { id, ok: true as const }
          : { id, ok: false as const, error: "not-applicable" as const };
      } catch {
        return { id, ok: false as const, error: "failed" as const };
      }
    }));
    return { count: results.filter((result) => result.ok).length, results };
  },

  async publishDueScheduled(now) {
    const scheduledPosts = await prisma.post.findMany({
      where: { status: PostStatus.SCHEDULED, publishedAt: { lte: now }, deletedAt: null },
      select: { id: true, slug: true, publishedAt: true },
    });
    if (scheduledPosts.length === 0) return { count: 0, published: [] };

    const ids = scheduledPosts.map((post) => post.id);
    // 單一原子 updateMany：WHERE 仍完整帶入資格條件，若編輯者在 findMany 後取消排程、
    // 延後 publishedAt 或刪除文章，該筆不會被此次 UPDATE 命中；相較逐筆迴圈，
    // 常數次資料庫往返不隨到期文章數量線性增長。
    const updateResult = await prisma.post.updateMany({
      where: { id: { in: ids }, status: PostStatus.SCHEDULED, publishedAt: { lte: now }, deletedAt: null },
      data: { status: PostStatus.PUBLISHED },
    });
    if (updateResult.count === 0) return { count: 0, published: [] };

    const publishedRows = await prisma.post.findMany({
      where: { id: { in: ids }, status: PostStatus.PUBLISHED },
      select: { id: true },
    });
    const publishedIds = new Set(publishedRows.map((row) => row.id));
    const published = scheduledPosts.filter((post) => publishedIds.has(post.id));
    return { count: published.length, published };
  },

  async listForExport(params) {
    const ids = params.ids?.filter(Boolean);
    const posts = await prisma.post.findMany({
      where: { deletedAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
      include: { categories: { select: { slug: true, name: true } }, tags: { select: { slug: true, name: true } } },
      orderBy: params.orderBy === "createdAtDesc" ? { createdAt: "desc" } : { createdAt: "desc" },
    });

    return posts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      coverImage: p.coverImage,
      readingTime: p.readingTime,
      featured: p.featured,
      allowRawHtml: p.allowRawHtml,
      showRawHtmlToc: p.showRawHtmlToc,
      status: mapPostStatusFromPrisma(p.status),
      publishedAt: p.publishedAt,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      ogImage: p.ogImage,
      categories: p.categories,
      tags: p.tags,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  },
};

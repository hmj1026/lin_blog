import { PostStatus } from "@prisma/client";
import type { PostRepository } from "../../application/ports";
import { prisma } from "@/lib/db";
import { mapPostStatusFromPrisma, mapPostStatusToPrisma } from "./mappers";

const postListItemSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  readingTime: true,
  featured: true,
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
      orderBy: { publishedAt: "desc" },
      take: params?.take ?? undefined,
    });
    return posts.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) }));
  },

  async listPublishedPaginated(params) {
    const { page, pageSize, categorySlug, tag } = params;
    const skip = (page - 1) * pageSize;

    const where = {
      status: PostStatus.PUBLISHED,
      deletedAt: null,
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
        orderBy: { publishedAt: "desc" },
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
        OR: [
          { title: { contains: trimmed, mode: "insensitive" } },
          { excerpt: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: postListItemSelect,
      orderBy: { publishedAt: "desc" },
      take,
    });
    return posts.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) }));
  },
  async listForAdmin() {
    const posts = await prisma.post.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      select: postListItemSelect,
    });
    return posts.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) }));
  },
  async countPublished() {
    return prisma.post.count({ where: { status: PostStatus.PUBLISHED, deletedAt: null } });
  },
  async countActive() {
    return prisma.post.count({ where: { deletedAt: null } });
  },
  async listPublishedForSitemap() {
    return prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED, deletedAt: null },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
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
        OR: relatedOr.length ? relatedOr : undefined,
      },
      select: postListItemSelect,
      orderBy: { publishedAt: "desc" },
      take: params.take,
    });
    return posts.map((p) => ({ ...p, status: mapPostStatusFromPrisma(p.status) }));
  },
  async create(data) {
    return prisma.post.create({
      data: {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.coverImage,
        readingTime: data.readingTime,
        featured: data.featured ?? false,
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
  },
  async update(id, data) {
    return prisma.post.update({
      where: { id },
      data: {
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: data.coverImage,
        readingTime: data.readingTime,
        featured: data.featured ?? false,
        status: mapPostStatusToPrisma(data.status),
        publishedAt: data.publishedAt,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ogImage: data.ogImage ?? null,
        authorId: data.authorId ?? undefined,
        categories: data.categoryIds ? { set: data.categoryIds.map((cid) => ({ id: cid })) } : undefined,
        tags: data.tagIds ? { set: data.tagIds.map((tid) => ({ id: tid })) } : undefined,
      },
      select: { id: true },
    });
  },
  async softDelete(id) {
    return prisma.post.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  },

  async batchAction(params) {
    if (params.postIds.length === 0) return { count: 0 };
    if (params.action === "publish") {
      const result = await prisma.post.updateMany({
        where: { id: { in: params.postIds }, deletedAt: null, status: PostStatus.DRAFT },
        data: { status: PostStatus.PUBLISHED },
      });
      return { count: result.count };
    }
    if (params.action === "draft") {
      const result = await prisma.post.updateMany({
        where: { id: { in: params.postIds }, deletedAt: null, status: PostStatus.PUBLISHED },
        data: { status: PostStatus.DRAFT },
      });
      return { count: result.count };
    }
    const result = await prisma.post.updateMany({
      where: { id: { in: params.postIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { count: result.count };
  },

  async publishDueScheduled(now) {
    const scheduledPosts = await prisma.post.findMany({
      where: { status: PostStatus.SCHEDULED, publishedAt: { lte: now }, deletedAt: null },
      select: { id: true, slug: true, publishedAt: true },
    });
    if (scheduledPosts.length === 0) return { count: 0, published: [] };

    const updateResult = await prisma.post.updateMany({
      where: { id: { in: scheduledPosts.map((p) => p.id) } },
      data: { status: PostStatus.PUBLISHED },
    });
    return { count: updateResult.count, published: scheduledPosts };
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

import type { CategoryRepository } from "../../application/ports";
import { prisma } from "@/lib/db";

export const categoryRepositoryPrisma: CategoryRepository = {
  async listActive(params) {
    return prisma.category.findMany({
      where: { deletedAt: null, showInNav: params?.showInNav ?? undefined },
      orderBy: [{ navOrder: "asc" }, { name: "asc" }],
    });
  },
  async listAll() {
    const categories = await prisma.category.findMany({
      orderBy: [{ navOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { posts: { where: { deletedAt: null } } } } },
    });
    return categories.map(({ _count, ...category }) => ({ ...category, postCount: _count.posts }));
  },
  async countActive() {
    return prisma.category.count({ where: { deletedAt: null } });
  },
  async getBySlug(slug) {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category || category.deletedAt) return null;
    return category;
  },
  async create(data) {
    return prisma.category.create({ data: { ...data } });
  },
  async update(id, data) {
    return prisma.category.update({ where: { id }, data });
  },
  async softDelete(id) {
    return prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });
  },
  async restore(id) {
    return prisma.category.update({ where: { id }, data: { deletedAt: null } });
  },
  countPostsByCategory: (categoryId) =>
    prisma.post.count({
      where: { deletedAt: null, categories: { some: { id: categoryId } } },
    }),
  async merge(sourceId, targetId) {
    return prisma.$transaction(async (tx) => {
      if (sourceId === targetId) throw new Error("分類不能合併到自身");
      const [source, target] = await Promise.all([
        tx.category.findUnique({ where: { id: sourceId }, select: { deletedAt: true, posts: { select: { id: true } } } }),
        tx.category.findUnique({ where: { id: targetId }, select: { deletedAt: true } }),
      ]);
      if (!source || source.deletedAt) throw new Error("來源分類不存在或已刪除");
      if (!target || target.deletedAt) throw new Error("目標分類不存在或已刪除");
      // 一次批次連結至目標、自來源移除並軟刪除來源，避免逐篇 update 造成 N+1 與交易逾時。
      const postIds = source.posts.map((post) => ({ id: post.id }));
      if (postIds.length > 0) {
        await tx.category.update({ where: { id: targetId }, data: { posts: { connect: postIds } } });
      }
      await tx.category.update({
        where: { id: sourceId },
        data: { deletedAt: new Date(), showInNav: false, ...(postIds.length > 0 ? { posts: { disconnect: postIds } } : {}) },
      });
      return { id: sourceId, movedPosts: source.posts.length };
    });
  },
};

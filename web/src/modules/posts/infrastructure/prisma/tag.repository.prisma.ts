import type { TagRepository } from "../../application/ports";
import { prisma } from "@/lib/db";

export const tagRepositoryPrisma: TagRepository = {
  async listActive() {
    return prisma.tag.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  },
  async listAll() {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: { where: { deletedAt: null } } } } },
    });
    return tags.map(({ _count, ...tag }) => ({ ...tag, postCount: _count.posts }));
  },
  async countActive() {
    return prisma.tag.count({ where: { deletedAt: null } });
  },
  async findBySlugOrName(value) {
    return prisma.tag.findMany({ where: { OR: [{ slug: value }, { name: value }] } });
  },
  async create(data) {
    return prisma.tag.create({ data });
  },
  async update(id, data) {
    return prisma.tag.update({ where: { id }, data });
  },
  async softDelete(id) {
    return prisma.tag.update({ where: { id }, data: { deletedAt: new Date() } });
  },
  async restore(id) {
    return prisma.tag.update({ where: { id }, data: { deletedAt: null } });
  },
  async merge(sourceId, targetId) {
    return prisma.$transaction(async (tx) => {
      if (sourceId === targetId) throw new Error("標籤不能合併到自身");
      const [source, target] = await Promise.all([
        tx.tag.findUnique({
          where: { id: sourceId },
          select: { deletedAt: true, posts: { select: { id: true, deletedAt: true, tags: { where: { id: targetId }, select: { id: true } } } } },
        }),
        tx.tag.findUnique({ where: { id: targetId }, select: { deletedAt: true } }),
      ]);
      if (!source || source.deletedAt) throw new Error("來源標籤不存在或已刪除");
      if (!target || target.deletedAt) throw new Error("目標標籤不存在或已刪除");
      // 一次批次連結至目標、自來源移除並軟刪除來源，避免逐篇 update 造成 N+1 與交易逾時。
      const postIds = source.posts.map((post) => ({ id: post.id }));
      if (postIds.length > 0) {
        await tx.tag.update({ where: { id: targetId }, data: { posts: { connect: postIds } } });
      }
      await tx.tag.update({
        where: { id: sourceId },
        data: { deletedAt: new Date(), ...(postIds.length > 0 ? { posts: { disconnect: postIds } } : {}) },
      });
      // movedPosts 僅計「未刪除且尚未連結目標」的來源文章：垃圾桶文章與重複關聯不得灌水目標計數。
      const movedPosts = source.posts.filter((post) => !post.deletedAt && post.tags.length === 0).length;
      return { id: sourceId, movedPosts };
    });
  },
};

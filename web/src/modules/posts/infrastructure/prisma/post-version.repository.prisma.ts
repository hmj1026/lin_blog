import type { PostVersionRepository } from "../../application/ports";
import { prisma } from "@/lib/db";

export const postVersionRepositoryPrisma: PostVersionRepository = {
  async listByPostId(postId) {
    return prisma.postVersion.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      include: { editor: { select: { name: true, email: true } } },
    });
  },

  async getById(params) {
    const version = await prisma.postVersion.findFirst({
      where: { id: params.versionId, postId: params.postId },
      include: { editor: { select: { name: true, email: true } } },
    });
    return version ?? null;
  },

  async create(data) {
    return prisma.postVersion.create({
      data: {
        postId: data.postId,
        title: data.title,
        excerpt: data.excerpt,
        content: data.content,
        editorId: data.editorId ?? null,
      },
      select: { id: true },
    });
  },
};


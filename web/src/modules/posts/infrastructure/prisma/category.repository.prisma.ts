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
    return prisma.category.findMany({ orderBy: [{ navOrder: "asc" }, { name: "asc" }] });
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
};

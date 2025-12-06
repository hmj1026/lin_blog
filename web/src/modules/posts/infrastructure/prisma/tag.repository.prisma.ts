import type { TagRepository } from "../../application/ports";
import { prisma } from "@/lib/db";

export const tagRepositoryPrisma: TagRepository = {
  async listActive() {
    return prisma.tag.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
  },
  async listAll() {
    return prisma.tag.findMany({ orderBy: { name: "asc" } });
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
};

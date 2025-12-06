import { prisma } from "@/lib/db";
import { UploadVisibility as PrismaUploadVisibility } from "@prisma/client";
import type { UploadRepository } from "../../application/ports";
import type { UploadVisibility } from "../../domain";

function mapVisibilityToPrisma(value: UploadVisibility) {
  return value === "PRIVATE" ? PrismaUploadVisibility.PRIVATE : PrismaUploadVisibility.PUBLIC;
}

function mapVisibilityFromPrisma(value: PrismaUploadVisibility): UploadVisibility {
  return value === PrismaUploadVisibility.PRIVATE ? "PRIVATE" : "PUBLIC";
}

export const uploadRepositoryPrisma: UploadRepository = {
  async list(params) {
    const uploads = await prisma.upload.findMany({
      where: {
        deletedAt: null,
        ...(params.search
          ? {
              originalName: { contains: params.search, mode: "insensitive" },
            }
          : {}),
        ...(params.type ? { mimeType: { startsWith: params.type } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params.take,
    });
    return uploads.map((u) => ({
      id: u.id,
      originalName: u.originalName,
      storageKey: u.storageKey,
      mimeType: u.mimeType,
      size: u.size,
      visibility: mapVisibilityFromPrisma(u.visibility),
      deletedAt: u.deletedAt,
      createdAt: u.createdAt,
    }));
  },

  async getById(id) {
    const upload = await prisma.upload.findUnique({ where: { id } });
    if (!upload) return null;
    return {
      id: upload.id,
      originalName: upload.originalName,
      storageKey: upload.storageKey,
      mimeType: upload.mimeType,
      size: upload.size,
      visibility: mapVisibilityFromPrisma(upload.visibility),
      deletedAt: upload.deletedAt,
      createdAt: upload.createdAt,
    };
  },

  async create(data) {
    return prisma.upload.create({
      data: {
        originalName: data.originalName,
        storageKey: data.storageKey,
        mimeType: data.mimeType,
        size: data.size,
        visibility: mapVisibilityToPrisma(data.visibility),
      },
      select: { id: true },
    });
  },

  async softDelete(id) {
    return prisma.upload.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  },
};


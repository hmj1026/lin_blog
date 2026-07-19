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

function buildListWhere(params: { search?: string; type?: string }) {
  return {
    deletedAt: null,
    ...(params.search ? { originalName: { contains: params.search, mode: "insensitive" as const } } : {}),
    ...(params.type ? { mimeType: { startsWith: params.type } } : {}),
  };
}

function mapUpload(u: Awaited<ReturnType<typeof prisma.upload.findMany>>[number]) {
  return {
    id: u.id,
    originalName: u.originalName,
    storageKey: u.storageKey,
    mimeType: u.mimeType,
    size: u.size,
    visibility: mapVisibilityFromPrisma(u.visibility),
    deletedAt: u.deletedAt,
    createdAt: u.createdAt,
  };
}

export const uploadRepositoryPrisma: UploadRepository = {
  async list(params) {
    const uploads = await prisma.upload.findMany({
      where: buildListWhere(params),
      orderBy: { createdAt: "desc" },
      take: params.take,
    });
    return uploads.map(mapUpload);
  },

  async listPage(params) {
    const where = buildListWhere(params);
    const [uploads, total] = await Promise.all([
      prisma.upload.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.upload.count({ where }),
    ]);
    return { items: uploads.map(mapUpload), total };
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

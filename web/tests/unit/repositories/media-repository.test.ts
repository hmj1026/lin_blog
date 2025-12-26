import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { UploadVisibility } from "@prisma/client";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    upload: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Import after mock
import { uploadRepositoryPrisma } from "@/modules/media/infrastructure/prisma/upload.repository.prisma";

describe("uploadRepositoryPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUpload = {
    id: "upload-123",
    originalName: "test-image.jpg",
    storageKey: "uploads/test-image.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    visibility: UploadVisibility.PUBLIC,
    deletedAt: null,
    createdAt: new Date(),
  };

  describe("list", () => {
    it("calls prisma.upload.findMany with correct params", async () => {
      (prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockUpload]);

      const result = await uploadRepositoryPrisma.list({ take: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockUpload.id);
      expect(prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          where: expect.objectContaining({
            deletedAt: null,
          }),
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("filters by search term", async () => {
      (prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await uploadRepositoryPrisma.list({ search: "test", take: 10 });

      expect(prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            originalName: { contains: "test", mode: "insensitive" },
            deletedAt: null,
          }),
        })
      );
    });

    it("filters by type", async () => {
      (prisma.upload.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await uploadRepositoryPrisma.list({ type: "image/", take: 10 });

      expect(prisma.upload.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            mimeType: { startsWith: "image/" },
            deletedAt: null,
          }),
        })
      );
    });
  });

  describe("getById", () => {
    it("returns upload when found", async () => {
      (prisma.upload.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);

      const result = await uploadRepositoryPrisma.getById("upload-123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockUpload.id);
      expect(prisma.upload.findUnique).toHaveBeenCalledWith({
        where: { id: "upload-123" },
      });
    });

    it("returns null when not found", async () => {
      (prisma.upload.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await uploadRepositoryPrisma.getById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates new upload record", async () => {
      const input = {
        originalName: "new.jpg",
        storageKey: "key",
        mimeType: "image/jpeg",
        size: 500,
        visibility: "PUBLIC" as const,
      };

      (prisma.upload.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-id" });

      const result = await uploadRepositoryPrisma.create(input);

      expect(result).toEqual({ id: "new-id" });
      expect(prisma.upload.create).toHaveBeenCalledWith({
        data: {
          originalName: input.originalName,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          size: input.size,
          visibility: UploadVisibility.PUBLIC,
        },
        select: { id: true },
      });
    });

    it("maps PRIVATE visibility correctly", async () => {
      const input = {
        originalName: "private.doc",
        storageKey: "key",
        mimeType: "application/pdf",
        size: 200,
        visibility: "PRIVATE" as const,
      };

      (prisma.upload.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-id" });

      await uploadRepositoryPrisma.create(input);

      expect(prisma.upload.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            visibility: UploadVisibility.PRIVATE,
          }),
        })
      );
    });
  });

  describe("softDelete", () => {
    it("updates deletedAt timestamp", async () => {
      (prisma.upload.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "upload-123" });

      await uploadRepositoryPrisma.softDelete("upload-123");

      expect(prisma.upload.update).toHaveBeenCalledWith({
        where: { id: "upload-123" },
        data: { deletedAt: expect.any(Date) },
        select: { id: true },
      });
    });
  });
});

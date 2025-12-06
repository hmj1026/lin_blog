import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMediaUseCases } from "@/modules/media/application/use-cases";
import type { UploadRepository, UploadRecord } from "@/modules/media/application/ports";

// Mock repository
const createMockRepo = (): UploadRepository => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  softDelete: vi.fn(),
});

const mockUpload: UploadRecord = {
  id: "upload-1",
  originalName: "test.jpg",
  storageKey: "uploads/test.jpg",
  mimeType: "image/jpeg",
  size: 1024,
  visibility: "PUBLIC",
  deletedAt: null,
  createdAt: new Date(),
};

describe("mediaUseCases", () => {
  let mockRepo: UploadRepository;
  let useCases: ReturnType<typeof createMediaUseCases>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    useCases = createMediaUseCases({ uploads: mockRepo });
  });

  describe("listUploads", () => {
    it("回傳上傳列表", async () => {
      (mockRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue([mockUpload]);

      const result = await useCases.listUploads({});
      expect(result).toEqual([mockUpload]);
      expect(mockRepo.list).toHaveBeenCalledWith({ search: undefined, type: undefined, take: 100 });
    });

    it("限制 take 最大值為 200", async () => {
      (mockRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await useCases.listUploads({ take: 500 });
      expect(mockRepo.list).toHaveBeenCalledWith({ search: undefined, type: undefined, take: 200 });
    });

    it("限制 take 最小值為 1", async () => {
      (mockRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await useCases.listUploads({ take: 0 });
      expect(mockRepo.list).toHaveBeenCalledWith({ search: undefined, type: undefined, take: 1 });
    });

    it("支援搜尋與類型篩選", async () => {
      (mockRepo.list as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await useCases.listUploads({ search: "test", type: "image", take: 50 });
      expect(mockRepo.list).toHaveBeenCalledWith({ search: "test", type: "image", take: 50 });
    });
  });

  describe("createUpload", () => {
    it("建立上傳記錄", async () => {
      (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-upload-id" });

      const data = {
        originalName: "new.png",
        storageKey: "uploads/new.png",
        mimeType: "image/png",
        size: 2048,
        visibility: "PUBLIC" as const,
      };

      const result = await useCases.createUpload(data);
      expect(result).toEqual({ id: "new-upload-id" });
      expect(mockRepo.create).toHaveBeenCalledWith(data);
    });
  });

  describe("getUploadById", () => {
    it("回傳上傳記錄", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);

      const result = await useCases.getUploadById("upload-1");
      expect(result).toEqual(mockUpload);
      expect(mockRepo.getById).toHaveBeenCalledWith("upload-1");
    });

    it("回傳 null 當記錄不存在", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCases.getUploadById("not-exist");
      expect(result).toBeNull();
    });
  });

  describe("softDeleteUpload", () => {
    it("軟刪除上傳記錄", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);
      (mockRepo.softDelete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "upload-1" });

      const result = await useCases.softDeleteUpload("upload-1");
      expect(result).toEqual({ ok: true });
      expect(mockRepo.softDelete).toHaveBeenCalledWith("upload-1");
    });

    it("回傳 not-found 當記錄不存在", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCases.softDeleteUpload("not-exist");
      expect(result).toEqual({ ok: false, error: "not-found" });
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });

    it("回傳 not-found 當記錄已刪除", async () => {
      const deletedUpload = { ...mockUpload, deletedAt: new Date() };
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(deletedUpload);

      const result = await useCases.softDeleteUpload("upload-1");
      expect(result).toEqual({ ok: false, error: "not-found" });
      expect(mockRepo.softDelete).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMediaUseCases } from "@/modules/media/application/use-cases";
import type { UploadRepository, UploadRecord, StoragePort, ImageProcessorPort } from "@/modules/media/application/ports";

// Mock repository
const createMockRepo = (): UploadRepository => ({
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  softDelete: vi.fn(),
});

const createMockStorage = (): StoragePort => ({
  putObject: vi.fn().mockResolvedValue({ ok: true }),
  getObjectStream: vi.fn(),
});

const createMockImageProcessor = (): ImageProcessorPort => ({
  process: vi.fn().mockImplementation(async (buffer: Buffer, mimeType: string) => ({ buffer, mimeType })),
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
  let mockStorage: StoragePort;
  let mockImageProcessor: ImageProcessorPort;
  let useCases: ReturnType<typeof createMediaUseCases>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    mockStorage = createMockStorage();
    mockImageProcessor = createMockImageProcessor();
    useCases = createMediaUseCases({ uploads: mockRepo, storage: mockStorage, imageProcessor: mockImageProcessor });
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

  describe("uploadFile", () => {
    it("processes, stores, and records the upload, returning id + src", async () => {
      (mockImageProcessor.process as ReturnType<typeof vi.fn>).mockResolvedValue({
        buffer: Buffer.from("processed"),
        mimeType: "image/webp",
      });
      (mockRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "up-1" });

      const result = await useCases.uploadFile({
        buffer: Buffer.from("orig"),
        mimeType: "image/jpeg",
        originalName: "photo.jpg",
      });

      expect(result).toEqual({ ok: true, id: "up-1", src: "/api/files/up-1" });
      expect(mockStorage.putObject).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: "image/webp", key: expect.stringMatching(/^uploads\/.+\.webp$/) })
      );
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ storageKey: expect.stringMatching(/^uploads\/.+\.webp$/), mimeType: "image/webp", visibility: "PUBLIC" })
      );
    });

    it("returns a retryable storage failure without creating a record", async () => {
      (mockImageProcessor.process as ReturnType<typeof vi.fn>).mockResolvedValue({
        buffer: Buffer.from("processed"),
        mimeType: "image/jpeg",
      });
      (mockStorage.putObject as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, retryable: true, message: "S3 down" });

      const result = await useCases.uploadFile({
        buffer: Buffer.from("orig"),
        mimeType: "image/jpeg",
        originalName: "photo.jpg",
      });

      expect(result).toEqual({ ok: false, error: "storage", retryable: true, message: "S3 down" });
      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe("openFileStream", () => {
    it("delegates to storage.getObjectStream by key", async () => {
      const streamResult = { ok: true, stream: new ReadableStream(), contentType: "image/png", contentLength: 3 };
      (mockStorage.getObjectStream as ReturnType<typeof vi.fn>).mockResolvedValue(streamResult);

      const result = await useCases.openFileStream("uploads/k1.png");

      expect(result).toBe(streamResult);
      expect(mockStorage.getObjectStream).toHaveBeenCalledWith({ key: "uploads/k1.png" });
    });
  });
});

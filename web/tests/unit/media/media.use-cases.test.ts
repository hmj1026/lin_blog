import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMediaUseCases } from "@/modules/media/application/use-cases";
import type { UploadRepository, UploadRecord, StoragePort, ImageProcessorPort } from "@/modules/media/application/ports";

// Mock repository
const createMockRepo = (): UploadRepository => ({
  list: vi.fn(),
  listPage: vi.fn(),
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
  let mockReferences: {
    listStructuredReferences: ReturnType<typeof vi.fn>;
    softDeleteUploadIfUnreferenced: ReturnType<typeof vi.fn>;
  };
  let useCases: ReturnType<typeof createMediaUseCases>;

  beforeEach(() => {
    mockRepo = createMockRepo();
    mockStorage = createMockStorage();
    mockImageProcessor = createMockImageProcessor();
    mockReferences = {
      listStructuredReferences: vi.fn().mockResolvedValue([]),
      softDeleteUploadIfUnreferenced: vi.fn().mockResolvedValue({ ok: true }),
    };
    useCases = createMediaUseCases({
      uploads: mockRepo,
      storage: mockStorage,
      imageProcessor: mockImageProcessor,
      references: mockReferences,
    } as any);
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

  describe("listUploadsPage", () => {
    it("以有界分頁參數查詢媒體", async () => {
      (mockRepo.listPage as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [mockUpload], total: 21 });

      const result = await useCases.listUploadsPage({ search: " hero ", type: "image/", page: 2, pageSize: 10 });

      expect(mockRepo.listPage).toHaveBeenCalledWith({ search: "hero", type: "image/", page: 2, pageSize: 10 });
      expect(result).toEqual({ items: [mockUpload], page: 2, pageSize: 10, total: 21, totalPages: 3 });
    });

    it("非白名單的具體 mime（image/png）需作為前綴過濾透傳，不得靜默回傳全部類型 (C5)", async () => {
      (mockRepo.listPage as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });

      await useCases.listUploadsPage({ type: "image/png", page: 1, pageSize: 20 });

      expect(mockRepo.listPage).toHaveBeenCalledWith(
        expect.objectContaining({ type: "image/png" })
      );
    });

    it("限制頁碼與每頁筆數，type 以前綴透傳（非白名單靜默降級）", async () => {
      (mockRepo.listPage as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });

      await useCases.listUploadsPage({ search: "x".repeat(150), type: "text/html", page: 0, pageSize: 500 });

      expect(mockRepo.listPage).toHaveBeenCalledWith({
        search: "x".repeat(100),
        type: "text/html",
        page: 1,
        pageSize: 100,
      });
    });

    it("請求頁碼超過刪除後縮減的總頁數時，以實際最後一頁重查而非回傳空列表", async () => {
      (mockRepo.listPage as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ items: [], total: 5 })
        .mockResolvedValueOnce({ items: [mockUpload], total: 5 });

      const result = await useCases.listUploadsPage({ page: 3, pageSize: 10 });

      expect(mockRepo.listPage).toHaveBeenNthCalledWith(2, { search: undefined, type: undefined, page: 1, pageSize: 10 });
      expect(result).toEqual({ items: [mockUpload], page: 1, pageSize: 10, total: 5, totalPages: 1 });
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
    it("returns structured deletion impact before confirmation", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);
      mockReferences.listStructuredReferences.mockResolvedValue([
        { resourceType: "post", resourceId: "post-1", field: "ogImage", label: "文章 OG 圖片" },
      ]);

      await expect(useCases.getUploadDeletionImpact("upload-1")).resolves.toEqual({
        ok: true,
        upload: mockUpload,
        references: [{ resourceType: "post", resourceId: "post-1", field: "ogImage", label: "文章 OG 圖片" }],
      });
    });

    it("軟刪除上傳記錄（透過原子性引用重驗）", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);
      mockReferences.softDeleteUploadIfUnreferenced.mockResolvedValue({ ok: true });

      const result = await useCases.softDeleteUpload("upload-1");
      expect(result).toEqual({ ok: true });
      expect(mockReferences.softDeleteUploadIfUnreferenced).toHaveBeenCalledWith("upload-1");
    });

    it("回傳 not-found 當記錄不存在", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await useCases.softDeleteUpload("not-exist");
      expect(result).toEqual({ ok: false, error: "not-found" });
      expect(mockReferences.softDeleteUploadIfUnreferenced).not.toHaveBeenCalled();
    });

    it("回傳 not-found 當記錄已刪除", async () => {
      const deletedUpload = { ...mockUpload, deletedAt: new Date() };
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(deletedUpload);

      const result = await useCases.softDeleteUpload("upload-1");
      expect(result).toEqual({ ok: false, error: "not-found" });
      expect(mockReferences.softDeleteUploadIfUnreferenced).not.toHaveBeenCalled();
    });

    it("阻擋仍被結構化欄位引用的媒體刪除（原子重驗回報引用）", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);
      mockReferences.softDeleteUploadIfUnreferenced.mockResolvedValue({
        ok: false,
        reason: "referenced",
        references: [{ resourceType: "post", resourceId: "post-1", field: "coverImage", label: "文章封面" }],
      });

      const result = await useCases.softDeleteUpload("upload-1");

      expect(result).toEqual({
        ok: false,
        error: "referenced",
        references: [{ resourceType: "post", resourceId: "post-1", field: "coverImage", label: "文章封面" }],
      });
    });

    it("並行寫入衝突回報 conflict（而非誤稱仍被引用）", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);
      mockReferences.softDeleteUploadIfUnreferenced.mockResolvedValue({ ok: false, reason: "conflict" });

      const result = await useCases.softDeleteUpload("upload-1");

      expect(result).toEqual({ ok: false, error: "conflict" });
    });

    it("阻擋需人工檢查的 Raw HTML 引用候選", async () => {
      (mockRepo.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpload);
      mockReferences.softDeleteUploadIfUnreferenced.mockResolvedValue({
        ok: false,
        reason: "referenced",
        references: [{ resourceType: "post", resourceId: "post-2", field: "content", certainty: "manual-review", label: "Raw HTML 可能引用：嵌入碼（需人工檢查）" }],
      });

      const result = await useCases.softDeleteUpload("upload-1");

      expect(result).toEqual(expect.objectContaining({ ok: false, error: "referenced" }));
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

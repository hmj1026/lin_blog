import { describe, expect, it, vi, beforeEach } from "vitest";
import { StorageError } from "@/modules/media/infrastructure/storage/adapter.interface";
import { Readable } from "stream";

// Mock file and bucket before importing adapter
const mockFile = {
  save: vi.fn(),
  exists: vi.fn(),
  getMetadata: vi.fn(),
  createReadStream: vi.fn(),
  delete: vi.fn(),
};

const mockBucket = {
  file: vi.fn(() => mockFile),
};

const mockStorage = {
  bucket: vi.fn(() => mockBucket),
};

// Mock @google-cloud/storage
vi.mock("@google-cloud/storage", () => ({
  Storage: class MockStorage {
    constructor() {
      return mockStorage;
    }
  },
}));

// Import after mock
import { GcsStorageAdapter } from "@/modules/media/infrastructure/storage/gcs.adapter";

describe("GcsStorageAdapter", () => {
  const config = {
    bucket: "test-bucket",
    projectId: "test-project",
    clientEmail: "test@project.iam.gserviceaccount.com",
    privateKey: "-----BEGIN PRIVATE KEY-----\\ntest\\n-----END PRIVATE KEY-----",
  };

  let adapter: GcsStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new GcsStorageAdapter(config);
  });

  describe("constructor", () => {
    it("should create adapter with config", () => {
      expect(adapter.provider).toBe("gcs");
    });

    it("should handle private key with escaped newlines", () => {
      const adapterWithNewlines = new GcsStorageAdapter({
        ...config,
        privateKey: "key\\nwith\\nnewlines",
      });
      expect(adapterWithNewlines.provider).toBe("gcs");
    });
  });

  describe("putObject", () => {
    it("should upload buffer successfully", async () => {
      mockFile.save.mockResolvedValue(undefined);

      const result = await adapter.putObject({
        key: "test/file.txt",
        body: Buffer.from("test content"),
        contentType: "text/plain",
      });

      expect(result.size).toBe(12);
      expect(mockFile.save).toHaveBeenCalled();
    });

    it("should upload stream successfully", async () => {
      mockFile.save.mockResolvedValue(undefined);

      const stream = Readable.from([Buffer.from("stream content")]);
      const result = await adapter.putObject({
        key: "test/file.txt",
        body: stream,
        contentType: "text/plain",
      });

      expect(result.size).toBe(14);
    });

    it("should throw StorageError on failure", async () => {
      mockFile.save.mockRejectedValue(new Error("Upload failed"));

      await expect(
        adapter.putObject({
          key: "test/file.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        })
      ).rejects.toThrow(StorageError);
    });

    it("should handle permission errors (403)", async () => {
      mockFile.save.mockRejectedValue({ code: 403, message: "Forbidden" });

      try {
        await adapter.putObject({
          key: "test/file.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("PERMISSION");
      }
    });

    it("should handle permission errors (401)", async () => {
      mockFile.save.mockRejectedValue({ code: 401, message: "Unauthorized" });

      try {
        await adapter.putObject({
          key: "test/file.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("PERMISSION");
      }
    });

    it("should handle not found errors (404)", async () => {
      mockFile.save.mockRejectedValue({ code: 404, message: "Not found" });

      try {
        await adapter.putObject({
          key: "test/file.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("NOT_FOUND");
      }
    });

    it("should handle ENOENT errors", async () => {
      mockFile.save.mockRejectedValue({ code: "ENOENT", message: "Not found" });

      try {
        await adapter.putObject({
          key: "test/file.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("NOT_FOUND");
      }
    });
  });

  describe("getObjectStream", () => {
    it("should get object stream successfully", async () => {
      mockFile.exists.mockResolvedValue([true]);
      mockFile.getMetadata.mockResolvedValue([
        { contentType: "text/plain", size: "100" },
      ]);
      mockFile.createReadStream.mockReturnValue(Readable.from(["test"]));

      const result = await adapter.getObjectStream({ key: "test/file.txt" });

      expect(result.contentType).toBe("text/plain");
      expect(result.contentLength).toBe(100);
      expect(result.stream).toBeDefined();
    });

    it("should handle missing size in metadata", async () => {
      mockFile.exists.mockResolvedValue([true]);
      mockFile.getMetadata.mockResolvedValue([{ contentType: "text/plain" }]);
      mockFile.createReadStream.mockReturnValue(Readable.from(["test"]));

      const result = await adapter.getObjectStream({ key: "test/file.txt" });

      expect(result.contentLength).toBeUndefined();
    });

    it("should throw NOT_FOUND error when object does not exist", async () => {
      mockFile.exists.mockResolvedValue([false]);

      try {
        await adapter.getObjectStream({ key: "nonexistent.txt" });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("NOT_FOUND");
      }
    });

    it("should handle temporary errors (503)", async () => {
      mockFile.exists.mockRejectedValue({ code: 503, message: "Service unavailable" });

      try {
        await adapter.getObjectStream({ key: "test.txt" });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("TEMPORARY");
      }
    });

    it("should handle temporary errors (500)", async () => {
      mockFile.exists.mockRejectedValue({ code: 500, message: "Internal error" });

      try {
        await adapter.getObjectStream({ key: "test.txt" });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("TEMPORARY");
      }
    });

    it("should handle ETIMEDOUT errors", async () => {
      mockFile.exists.mockRejectedValue({ code: "ETIMEDOUT", message: "Timeout" });

      try {
        await adapter.getObjectStream({ key: "test.txt" });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("TEMPORARY");
      }
    });

    it("should handle ECONNRESET errors", async () => {
      mockFile.exists.mockRejectedValue({ code: "ECONNRESET", message: "Connection reset" });

      try {
        await adapter.getObjectStream({ key: "test.txt" });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("TEMPORARY");
      }
    });
  });

  describe("deleteObject", () => {
    it("should delete object successfully", async () => {
      mockFile.delete.mockResolvedValue(undefined);

      await expect(
        adapter.deleteObject({ key: "test/file.txt" })
      ).resolves.toBeUndefined();
      expect(mockFile.delete).toHaveBeenCalledWith({ ignoreNotFound: true });
    });

    it("should not throw on not found errors", async () => {
      const notFoundError = new StorageError("Not found", "NOT_FOUND");
      mockFile.delete.mockRejectedValue(notFoundError);

      await expect(
        adapter.deleteObject({ key: "nonexistent.txt" })
      ).resolves.toBeUndefined();
    });

    it("should throw on permission errors", async () => {
      mockFile.delete.mockRejectedValue({ code: 403, message: "Forbidden" });

      await expect(
        adapter.deleteObject({ key: "test.txt" })
      ).rejects.toThrow(StorageError);
    });
  });

  describe("toStorageError", () => {
    it("should return same error if already StorageError", async () => {
      const originalError = new StorageError("Original", "PERMISSION");
      mockFile.save.mockRejectedValue(originalError);

      try {
        await adapter.putObject({
          key: "test.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBe(originalError);
      }
    });

    it("should handle error without message", async () => {
      mockFile.save.mockRejectedValue({ code: 999 });

      try {
        await adapter.putObject({
          key: "test.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).message).toBe("putObject failed");
        expect((e as StorageError).code).toBe("UNKNOWN");
      }
    });
  });
});

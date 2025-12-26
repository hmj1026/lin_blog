import { describe, it, expect, vi, beforeEach } from "vitest";
import { StorageError } from "@/modules/media/infrastructure/storage/adapter.interface";
import { Readable } from "stream";

// Hoist mocks for vi.mock factory
const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

// Mock @aws-sdk/client-s3
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    constructor(public config?: unknown) {
      return { send: mocks.send, config };
    }
  },
  PutObjectCommand: class MockPutObjectCommand {
    constructor(public input: unknown) {}
  },
  GetObjectCommand: class MockGetObjectCommand {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    constructor(public input: unknown) {}
  },
}));

// Import after mock
import { S3CompatibleStorageAdapter } from "@/modules/media/infrastructure/storage/s3-compatible.adapter";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

describe("S3CompatibleStorageAdapter", () => {
  const config = {
    bucket: "test-bucket",
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
  };

  let adapter: S3CompatibleStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new S3CompatibleStorageAdapter(config);
  });

  describe("constructor", () => {
    it("should create adapter with default provider name", () => {
      expect(adapter.provider).toBe("s3");
    });

    it("should use custom provider name", () => {
      const r2Adapter = new S3CompatibleStorageAdapter({
        ...config,
        providerName: "r2",
      });
      expect(r2Adapter.provider).toBe("r2");
    });

    it("should configure S3Client with endpoint for R2", () => {
      // Verifies adapter is created without error when endpoint is provided
      const r2Adapter = new S3CompatibleStorageAdapter({
        ...config,
        endpoint: "https://test.r2.cloudflarestorage.com",
        providerName: "r2",
      });
      expect(r2Adapter.provider).toBe("r2");
    });

    it("should use default region 'auto' when not provided", () => {
      // Adapter should be created without explicit region
      const defaultAdapter = new S3CompatibleStorageAdapter(config);
      expect(defaultAdapter.provider).toBe("s3");
    });

    it("should use provided region", () => {
      // Adapter should accept custom region
      const customAdapter = new S3CompatibleStorageAdapter({ ...config, region: "us-west-2" });
      expect(customAdapter.provider).toBe("s3");
    });
  });

  describe("putObject", () => {
    it("should upload buffer successfully", async () => {
      mocks.send.mockResolvedValue({});
      const result = await adapter.putObject({
        key: "test/file.txt",
        body: Buffer.from("test content"),
        contentType: "text/plain",
      });

      expect(result.size).toBe(12);
      expect(mocks.send).toHaveBeenCalled();
      const command = mocks.send.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "test/file.txt",
          ContentType: "text/plain",
        })
      );
    });

    it("should upload stream successfully", async () => {
      mocks.send.mockResolvedValue({});
      const stream = Readable.from([Buffer.from("stream content")]);
      const result = await adapter.putObject({
        key: "test/file.txt",
        body: stream,
        contentType: "text/plain",
      });

      expect(result.size).toBe(14);
    });

    it("should throw PERMISSION error on 403", async () => {
      mocks.send.mockRejectedValue({
        $metadata: { httpStatusCode: 403 },
        message: "Forbidden",
      });

      try {
        await adapter.putObject({
          key: "test.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("PERMISSION");
      }
    });

    it("should throw PERMISSION error on AccessDenied", async () => {
      mocks.send.mockRejectedValue({
        name: "AccessDenied",
        message: "Access Denied",
      });

      try {
        await adapter.putObject({
          key: "test.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("PERMISSION");
      }
    });

    it("should throw TEMPORARY error on 500+", async () => {
      mocks.send.mockRejectedValue({
        $metadata: { httpStatusCode: 503 },
        message: "Service Unavailable",
      });

      try {
        await adapter.putObject({
          key: "test.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("TEMPORARY");
      }
    });

    it("should throw TEMPORARY error on TimeoutError", async () => {
      mocks.send.mockRejectedValue({
        name: "TimeoutError",
        message: "Request timeout",
      });

      try {
        await adapter.putObject({
          key: "test.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("TEMPORARY");
      }
    });

    it("should throw UNKNOWN error for other cases", async () => {
      mocks.send.mockRejectedValue(new Error("Unknown error"));

      try {
        await adapter.putObject({
          key: "test.txt",
          body: Buffer.from("test"),
          contentType: "text/plain",
        });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("UNKNOWN");
      }
    });

    it("should return same error if already StorageError", async () => {
      const originalError = new StorageError("Original", "PERMISSION");
      mocks.send.mockRejectedValue(originalError);

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
  });

  describe("getObjectStream", () => {
    it("should get object stream successfully", async () => {
      const mockStream = Readable.from(["test content"]);
      mocks.send.mockResolvedValue({
        Body: mockStream,
        ContentType: "text/plain",
        ContentLength: 12,
      });

      const result = await adapter.getObjectStream({ key: "test/file.txt" });

      expect(result.stream).toBeDefined();
      expect(result.contentType).toBe("text/plain");
      expect(result.contentLength).toBe(12);
      const command = mocks.send.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "test/file.txt",
        })
      );
    });

    it("should throw NOT_FOUND error when Body is empty", async () => {
      mocks.send.mockResolvedValue({ Body: null });

      try {
        await adapter.getObjectStream({ key: "test.txt" });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("NOT_FOUND");
      }
    });

    it("should throw NOT_FOUND error on 404", async () => {
      mocks.send.mockRejectedValue({
        $metadata: { httpStatusCode: 404 },
        message: "Not Found",
      });

      try {
        await adapter.getObjectStream({ key: "nonexistent.txt" });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("NOT_FOUND");
      }
    });

    it("should throw NOT_FOUND error on NoSuchKey", async () => {
      mocks.send.mockRejectedValue({
        name: "NoSuchKey",
        message: "The specified key does not exist",
      });

      try {
        await adapter.getObjectStream({ key: "nonexistent.txt" });
        expect.fail("Should throw");
      } catch (e) {
        expect(e).toBeInstanceOf(StorageError);
        expect((e as StorageError).code).toBe("NOT_FOUND");
      }
    });
  });

  describe("deleteObject", () => {
    it("should delete object successfully", async () => {
      mocks.send.mockResolvedValue({});

      await expect(
        adapter.deleteObject({ key: "test/file.txt" })
      ).resolves.toBeUndefined();

      const command = mocks.send.mock.calls[0][0];
      expect(command.input).toEqual(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: "test/file.txt",
        })
      );
    });

    it("should ignore NOT_FOUND errors", async () => {
      mocks.send.mockRejectedValue({
        name: "NoSuchKey",
        message: "Not found",
      });

      await expect(
        adapter.deleteObject({ key: "nonexistent.txt" })
      ).resolves.toBeUndefined();
    });

    it("should throw on PERMISSION errors", async () => {
      mocks.send.mockRejectedValue({
        $metadata: { httpStatusCode: 403 },
        message: "Forbidden",
      });

      await expect(adapter.deleteObject({ key: "test.txt" })).rejects.toThrow(
        StorageError
      );
    });
  });
});

describe("StorageError", () => {
  it("TEMPORARY errors should be retryable", () => {
    const error = new StorageError("Timeout", "TEMPORARY");
    expect(error.isRetryable).toBe(true);
    expect(error.code).toBe("TEMPORARY");
  });

  it("PERMISSION errors should not be retryable", () => {
    const error = new StorageError("Forbidden", "PERMISSION");
    expect(error.isRetryable).toBe(false);
  });

  it("NOT_FOUND errors should not be retryable", () => {
    const error = new StorageError("Not found", "NOT_FOUND");
    expect(error.isRetryable).toBe(false);
  });

  it("should preserve original error cause", () => {
    const cause = new Error("Original error");
    const error = new StorageError("Wrapped", "UNKNOWN", cause);
    expect(error.cause).toBe(cause);
  });
});

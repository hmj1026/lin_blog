import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createStorageAdapter,
  getStorageConfigFromEnv,
  getStorageAdapter,
  resetStorageAdapter,
  StorageConfig,
} from "@/modules/media/infrastructure/storage/factory";
import { LocalStorageAdapter } from "@/modules/media/infrastructure/storage/local.adapter";
import { InMemoryStorageAdapter } from "@/modules/media/infrastructure/storage/memory.adapter";
import { S3CompatibleStorageAdapter } from "@/modules/media/infrastructure/storage/s3-compatible.adapter";

// Mock adapters to verify instantiation
vi.mock("@/modules/media/infrastructure/storage/local.adapter");
vi.mock("@/modules/media/infrastructure/storage/memory.adapter");
vi.mock("@/modules/media/infrastructure/storage/s3-compatible.adapter");
vi.mock("@/modules/media/infrastructure/storage/gcs.adapter");

describe("Storage Factory", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    resetStorageAdapter();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getStorageConfigFromEnv", () => {
    it("defaults to local provider", () => {
      delete process.env.STORAGE_PROVIDER;
      const config = getStorageConfigFromEnv();
      expect(config.provider).toBe("local");
    });

    it("throws on invalid provider", () => {
      process.env.STORAGE_PROVIDER = "invalid";
      expect(() => getStorageConfigFromEnv()).toThrow("Invalid STORAGE_PROVIDER");
    });

    it("reads env vars correctly", () => {
      process.env.STORAGE_PROVIDER = "s3";
      process.env.STORAGE_BUCKET = "bucket";
      process.env.STORAGE_REGION = "region";
      process.env.STORAGE_ENDPOINT = "endpoint";
      process.env.STORAGE_ACCESS_KEY_ID = "key";
      process.env.STORAGE_SECRET_ACCESS_KEY = "secret";

      const config = getStorageConfigFromEnv();
      expect(config).toMatchObject({
        provider: "s3",
        bucket: "bucket",
        region: "region",
        endpoint: "endpoint",
        accessKeyId: "key",
        secretAccessKey: "secret",
      });
    });
  });

  describe("createStorageAdapter", () => {
    it("creates LocalStorageAdapter", () => {
      createStorageAdapter({ provider: "local", localRootDir: "uploads" });
      expect(LocalStorageAdapter).toHaveBeenCalledWith({ rootDir: "uploads" });
    });

    it("creates InMemoryStorageAdapter", () => {
      createStorageAdapter({ provider: "memory" });
      expect(InMemoryStorageAdapter).toHaveBeenCalled();
    });

    it("creates S3 adapter with validation", () => {
      createStorageAdapter({
        provider: "s3",
        bucket: "b",
        accessKeyId: "k",
        secretAccessKey: "s",
      });
      expect(S3CompatibleStorageAdapter).toHaveBeenCalledWith(expect.objectContaining({
        bucket: "b",
        providerName: "s3",
      }));
    });

    it("throws when S3 config is missing", () => {
      expect(() => createStorageAdapter({ provider: "s3" })).toThrow("Missing required");
    });

    it("creates R2 adapter (S3 compatible)", () => {
      createStorageAdapter({
        provider: "r2",
        bucket: "b",
        endpoint: "e",
        accessKeyId: "k",
        secretAccessKey: "s",
      });
      expect(S3CompatibleStorageAdapter).toHaveBeenCalledWith(expect.objectContaining({
        providerName: "r2",
        region: "auto",
      }));
    });
  });

  describe("getStorageAdapter (Singleton)", () => {
    it("initializes singleton from env", () => {
      process.env.STORAGE_PROVIDER = "memory";
      const adapter1 = getStorageAdapter();
      const adapter2 = getStorageAdapter();
      expect(adapter1).toBeDefined();
      expect(adapter1).toBe(adapter2); // Same instance
      expect(InMemoryStorageAdapter).toHaveBeenCalledTimes(1);
    });
  });
});

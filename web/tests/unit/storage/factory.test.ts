import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  createStorageAdapter,
  getStorageConfigFromEnv,
  resetStorageAdapter,
  getStorageAdapter,
  setStorageAdapter,
  type StorageConfig,
} from "@/modules/media/infrastructure/storage/factory";
import { LocalStorageAdapter } from "@/modules/media/infrastructure/storage/local.adapter";
import { InMemoryStorageAdapter } from "@/modules/media/infrastructure/storage/memory.adapter";

describe("Storage Factory", () => {
  beforeEach(() => {
    resetStorageAdapter();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetStorageAdapter();
  });

  describe("createStorageAdapter", () => {
    it("provider=local 回傳 LocalStorageAdapter", () => {
      const config: StorageConfig = { provider: "local" };
      const adapter = createStorageAdapter(config);

      expect(adapter).toBeInstanceOf(LocalStorageAdapter);
      expect(adapter.provider).toBe("local");
    });

    it("provider=memory 回傳 InMemoryStorageAdapter", () => {
      const config: StorageConfig = { provider: "memory" };
      const adapter = createStorageAdapter(config);

      expect(adapter).toBeInstanceOf(InMemoryStorageAdapter);
      expect(adapter.provider).toBe("memory");
    });

    it("provider=s3 缺少必要設定時拋錯", () => {
      const config: StorageConfig = { provider: "s3" };

      expect(() => createStorageAdapter(config)).toThrow(
        /Missing required environment variables.*s3/i
      );
    });

    it("provider=r2 缺少 endpoint 時拋錯", () => {
      const config: StorageConfig = {
        provider: "r2",
        bucket: "test",
        accessKeyId: "key",
        secretAccessKey: "secret",
        // 故意缺少 endpoint
      };

      expect(() => createStorageAdapter(config)).toThrow(/STORAGE_ENDPOINT/);
    });

    it("provider=gcs 缺少必要設定時拋錯", () => {
      const config: StorageConfig = {
        provider: "gcs",
        bucket: "test",
        // 缺少 gcsProjectId, gcsClientEmail, gcsPrivateKey
      };

      expect(() => createStorageAdapter(config)).toThrow(
        /Missing required environment variables.*GCS/i
      );
    });
  });

  describe("getStorageConfigFromEnv", () => {
    it("預設為 local provider", () => {
      vi.stubEnv("STORAGE_PROVIDER", "");
      const config = getStorageConfigFromEnv();

      expect(config.provider).toBe("local");
    });

    it("正確讀取 memory provider", () => {
      vi.stubEnv("STORAGE_PROVIDER", "memory");
      const config = getStorageConfigFromEnv();

      expect(config.provider).toBe("memory");
    });

    it("無效的 provider 拋錯", () => {
      vi.stubEnv("STORAGE_PROVIDER", "invalid");

      expect(() => getStorageConfigFromEnv()).toThrow(/Invalid STORAGE_PROVIDER/);
    });
  });

  describe("Singleton", () => {
    it("getStorageAdapter 回傳同一實例", () => {
      vi.stubEnv("STORAGE_PROVIDER", "memory");

      const adapter1 = getStorageAdapter();
      const adapter2 = getStorageAdapter();

      expect(adapter1).toBe(adapter2);
    });

    it("resetStorageAdapter 後重新建立實例", () => {
      vi.stubEnv("STORAGE_PROVIDER", "memory");

      const adapter1 = getStorageAdapter();
      resetStorageAdapter();
      const adapter2 = getStorageAdapter();

      expect(adapter1).not.toBe(adapter2);
    });

    it("setStorageAdapter 可覆蓋實例", () => {
      const customAdapter = new InMemoryStorageAdapter();
      setStorageAdapter(customAdapter);

      const adapter = getStorageAdapter();
      expect(adapter).toBe(customAdapter);
    });
  });
});

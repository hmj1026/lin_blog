/**
 * Storage Adapter Factory
 *
 * 根據環境變數建立對應的 Storage Adapter。
 * 缺少必要設定時會 fail fast 並拋出明確錯誤。
 */

import type { ObjectStorageAdapter } from "./adapter.interface";
import { LocalStorageAdapter } from "./local.adapter";
import { InMemoryStorageAdapter } from "./memory.adapter";
import { S3CompatibleStorageAdapter } from "./s3-compatible.adapter";
import { GcsStorageAdapter } from "./gcs.adapter";

/**
 * 支援的 Storage Provider 類型
 */
export type StorageProvider = "local" | "memory" | "s3" | "r2" | "gcs";

/**
 * Storage Factory 設定（從環境變數讀取）
 */
export interface StorageConfig {
  provider: StorageProvider;
  // Local adapter
  localRootDir?: string;
  // S3/R2 共用
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  // GCS
  gcsProjectId?: string;
  gcsClientEmail?: string;
  gcsPrivateKey?: string;
}

/**
 * 驗證 S3/R2 設定，缺少必要欄位時拋錯
 */
function validateS3Config(config: StorageConfig, provider: "s3" | "r2"): void {
  const missing: string[] = [];

  if (!config.bucket) missing.push("STORAGE_BUCKET");
  if (!config.accessKeyId) missing.push("STORAGE_ACCESS_KEY_ID");
  if (!config.secretAccessKey) missing.push("STORAGE_SECRET_ACCESS_KEY");

  // R2 需要 endpoint
  if (provider === "r2" && !config.endpoint) {
    missing.push("STORAGE_ENDPOINT");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for ${provider.toUpperCase()} storage: ${missing.join(", ")}`
    );
  }
}

/**
 * 驗證 GCS 設定，缺少必要欄位時拋錯
 */
function validateGcsConfig(config: StorageConfig): void {
  const missing: string[] = [];

  if (!config.bucket) missing.push("STORAGE_BUCKET");
  if (!config.gcsProjectId) missing.push("GCS_PROJECT_ID");
  if (!config.gcsClientEmail) missing.push("GCS_CLIENT_EMAIL");
  if (!config.gcsPrivateKey) missing.push("GCS_PRIVATE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for GCS storage: ${missing.join(", ")}`
    );
  }
}

/**
 * 建立 Storage Adapter
 *
 * @param config - Storage 設定（通常從環境變數讀取）
 * @returns ObjectStorageAdapter 實例
 * @throws 缺少必要設定時拋出 Error
 */
export function createStorageAdapter(config: StorageConfig): ObjectStorageAdapter {
  switch (config.provider) {
    case "local":
      return new LocalStorageAdapter({
        rootDir: config.localRootDir,
      });

    case "memory":
      return new InMemoryStorageAdapter();

    case "s3":
      validateS3Config(config, "s3");
      return new S3CompatibleStorageAdapter({
        bucket: config.bucket!,
        region: config.region,
        endpoint: config.endpoint,
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
        providerName: "s3",
      });

    case "r2":
      validateS3Config(config, "r2");
      return new S3CompatibleStorageAdapter({
        bucket: config.bucket!,
        region: "auto", // R2 不需要真實 region
        endpoint: config.endpoint!,
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
        providerName: "r2",
      });

    case "gcs":
      validateGcsConfig(config);
      return new GcsStorageAdapter({
        bucket: config.bucket!,
        projectId: config.gcsProjectId!,
        clientEmail: config.gcsClientEmail!,
        privateKey: config.gcsPrivateKey!,
      });

    default: {
      const _exhaustive: never = config.provider;
      throw new Error(`Unknown storage provider: ${_exhaustive}`);
    }
  }
}

/**
 * 從環境變數讀取 StorageConfig
 */
export function getStorageConfigFromEnv(): StorageConfig {
  const providerRaw = process.env.STORAGE_PROVIDER || "local";
  const validProviders: StorageProvider[] = ["local", "memory", "s3", "r2", "gcs"];

  if (!validProviders.includes(providerRaw as StorageProvider)) {
    throw new Error(
      `Invalid STORAGE_PROVIDER: "${providerRaw}". Valid values: ${validProviders.join(", ")}`
    );
  }

  return {
    provider: providerRaw as StorageProvider,
    localRootDir: process.env.STORAGE_LOCAL_ROOT_DIR,
    bucket: process.env.STORAGE_BUCKET,
    region: process.env.STORAGE_REGION,
    endpoint: process.env.STORAGE_ENDPOINT,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    gcsProjectId: process.env.GCS_PROJECT_ID,
    gcsClientEmail: process.env.GCS_CLIENT_EMAIL,
    gcsPrivateKey: process.env.GCS_PRIVATE_KEY,
  };
}

// ============================================================================
// Singleton instance（供 API routes 使用）
// ============================================================================

let _storageAdapter: ObjectStorageAdapter | null = null;

/**
 * 取得全域 Storage Adapter 單例
 *
 * 首次呼叫時會從環境變數初始化，後續呼叫回傳同一實例。
 * 若需要重設（例如測試），使用 resetStorageAdapter()。
 */
export function getStorageAdapter(): ObjectStorageAdapter {
  if (!_storageAdapter) {
    const config = getStorageConfigFromEnv();
    _storageAdapter = createStorageAdapter(config);
  }
  return _storageAdapter;
}

/**
 * 重設全域 Storage Adapter（測試用）
 */
export function resetStorageAdapter(): void {
  _storageAdapter = null;
}

/**
 * 以指定的 adapter 覆蓋全域實例（測試用）
 */
export function setStorageAdapter(adapter: ObjectStorageAdapter): void {
  _storageAdapter = adapter;
}

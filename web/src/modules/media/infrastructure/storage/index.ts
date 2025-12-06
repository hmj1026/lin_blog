/**
 * Storage Infrastructure 模組匯出
 */

// Adapter interface & errors
export {
  StorageError,
  type StorageErrorCode,
  type ObjectStorageAdapter,
  type PutObjectParams,
  type PutObjectResult,
  type GetObjectStreamParams,
  type GetObjectStreamResult,
  type DeleteObjectParams,
} from "./adapter.interface";

// Adapters
export { LocalStorageAdapter } from "./local.adapter";
export { InMemoryStorageAdapter } from "./memory.adapter";

// Factory
export {
  createStorageAdapter,
  getStorageConfigFromEnv,
  getStorageAdapter,
  resetStorageAdapter,
  setStorageAdapter,
  type StorageProvider,
  type StorageConfig,
} from "./factory";

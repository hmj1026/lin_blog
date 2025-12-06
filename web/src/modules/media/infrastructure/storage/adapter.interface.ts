/**
 * Storage Adapter 抽象介面與錯誤定義
 *
 * 提供統一的物件儲存操作介面，支援 local、memory、s3、r2、gcs 等後端。
 */

import type { Readable } from "stream";

// ============================================================================
// Error Types
// ============================================================================

/**
 * Storage 錯誤代碼
 * - TEMPORARY: 暫時性錯誤（網路逾時、rate limit、5xx），可重試
 * - PERMISSION: 權限錯誤（403），不應重試
 * - NOT_FOUND: 物件不存在（404）
 * - UNKNOWN: 未知錯誤
 */
export type StorageErrorCode = "TEMPORARY" | "PERMISSION" | "NOT_FOUND" | "UNKNOWN";

/**
 * Storage 操作錯誤
 */
export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly cause?: unknown;

  constructor(message: string, code: StorageErrorCode, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.cause = cause;
  }

  /** 是否為可重試的暫時性錯誤 */
  get isRetryable(): boolean {
    return this.code === "TEMPORARY";
  }
}

// ============================================================================
// Adapter Interface
// ============================================================================

/**
 * putObject 參數
 */
export interface PutObjectParams {
  /** 物件 key（例如 `uploads/<uuid>.jpg`） */
  key: string;
  /** MIME type（例如 `image/jpeg`） */
  contentType: string;
  /** 檔案內容（Buffer 或 Readable stream） */
  body: Buffer | Readable;
}

/**
 * putObject 回傳值
 */
export interface PutObjectResult {
  /** 寫入的位元組數（部分 provider 可能無法取得） */
  size?: number;
}

/**
 * getObjectStream 參數
 */
export interface GetObjectStreamParams {
  /** 物件 key */
  key: string;
}

/**
 * getObjectStream 回傳值
 */
export interface GetObjectStreamResult {
  /** 可讀取的 stream（Node.js Readable 或 Web ReadableStream） */
  stream: Readable | ReadableStream;
  /** MIME type（若 provider 有提供） */
  contentType?: string;
  /** 檔案大小（若 provider 有提供） */
  contentLength?: number;
}

/**
 * deleteObject 參數
 */
export interface DeleteObjectParams {
  /** 物件 key */
  key: string;
}

/**
 * 物件儲存 Adapter 介面
 *
 * 所有 storage provider 實作此介面，以統一上層 API 的操作方式。
 */
export interface ObjectStorageAdapter {
  /** Provider 識別名稱（用於 log / debug） */
  readonly provider: string;

  /**
   * 寫入物件
   * @throws {StorageError} 寫入失敗時
   */
  putObject(params: PutObjectParams): Promise<PutObjectResult>;

  /**
   * 取得物件的可讀 stream
   * @throws {StorageError} 讀取失敗時（NOT_FOUND 表示物件不存在）
   */
  getObjectStream(params: GetObjectStreamParams): Promise<GetObjectStreamResult>;

  /**
   * 刪除物件（若物件不存在，不拋錯，視為成功）
   * @throws {StorageError} 刪除失敗時（權限錯誤等）
   */
  deleteObject(params: DeleteObjectParams): Promise<void>;
}

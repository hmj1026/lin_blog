import type { Readable } from "stream";
import type { UploadVisibility } from "../domain";

export type UploadRecord = {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  visibility: UploadVisibility;
  deletedAt: Date | null;
  createdAt: Date;
};

export interface UploadRepository {
  list(params: { search?: string; type?: string; take: number }): Promise<UploadRecord[]>;
  getById(id: string): Promise<UploadRecord | null>;
  create(data: {
    originalName: string;
    storageKey: string;
    mimeType: string;
    size: number;
    visibility: UploadVisibility;
  }): Promise<{ id: string }>;
  softDelete(id: string): Promise<{ id: string }>;
}

/** 圖片處理結果（處理後的內容與 MIME type） */
export type ProcessedImage = {
  buffer: Buffer;
  mimeType: string;
};

/**
 * 圖片處理 Port —— 由組合根注入具體實作（Sharp）並綁定壓縮設定，
 * use-case 只需傳入 buffer / mimeType，無需知道任何設定或框架細節。
 */
export interface ImageProcessorPort {
  process(buffer: Buffer, mimeType: string): Promise<ProcessedImage>;
}

/** 儲存寫入結果：成功，或可判斷是否可重試的失敗 */
export type StoragePutResult =
  | { ok: true }
  | { ok: false; retryable: boolean; message: string };

/** 儲存讀取結果：成功回傳 stream，或物件不存在 */
export type StorageStreamResult =
  | { ok: true; stream: Readable | ReadableStream; contentType?: string; contentLength?: number }
  | { ok: false; reason: "not-found" };

/**
 * 物件儲存 Port（僅暴露 use-case 需要的兩個操作）。
 * 具體 StorageError 由組合根翻譯為上述離散結果，use-case 不 import 任何 infrastructure。
 */
export interface StoragePort {
  putObject(params: { key: string; contentType: string; body: Buffer }): Promise<StoragePutResult>;
  getObjectStream(params: { key: string }): Promise<StorageStreamResult>;
}


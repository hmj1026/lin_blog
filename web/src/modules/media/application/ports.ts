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
  /** 以資料庫層級的篩選與分頁取得管理端媒體。 */
  listPage(params: { search?: string; type?: string; page: number; pageSize: number }): Promise<{ items: UploadRecord[]; total: number }>;
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

export type MediaReference = {
  resourceType: "post" | "site-setting";
  resourceId: string;
  field: "coverImage" | "ogImage" | "heroImage" | "content";
  certainty: "exact" | "manual-review";
  label: string;
};

/** 查詢媒體在結構化欄位、文章內容及 Raw HTML 候選中的引用。 */
export interface MediaReferenceRepository {
  listStructuredReferences(uploadId: string): Promise<MediaReference[]>;
  /**
   * 於同一交易內重新確認引用（含垃圾桶文章），僅在無引用時軟刪除該上傳。
   * 回傳成功、殘留引用清單（referenced），或並行寫入衝突（conflict，應提示重試）。
   * 關閉「確認無引用後、刪除前新增引用」的競態。
   */
  softDeleteUploadIfUnreferenced(uploadId: string): Promise<
    | { ok: true }
    | { ok: false; reason: "referenced"; references: MediaReference[] }
    | { ok: false; reason: "conflict" }
  >;
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

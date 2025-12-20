/**
 * In-Memory Storage Adapter
 *
 * 將檔案存放於記憶體中，適用於單元測試。
 * 無持久化，程式結束後資料消失。
 */

import { Readable } from "stream";
import type {
  ObjectStorageAdapter,
  PutObjectParams,
  PutObjectResult,
  GetObjectStreamParams,
  GetObjectStreamResult,
  DeleteObjectParams,
} from "./adapter.interface";
import { StorageError } from "./adapter.interface";

interface StoredObject {
  buffer: Buffer;
  contentType: string;
}

/**
 * 記憶體 Storage Adapter（測試用）
 */
export class InMemoryStorageAdapter implements ObjectStorageAdapter {
  readonly provider = "memory";
  private readonly store = new Map<string, StoredObject>();

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    let buffer: Buffer;

    if (Buffer.isBuffer(params.body)) {
      buffer = params.body;
    } else {
      // Readable stream → Buffer
      const chunks: Buffer[] = [];
      for await (const chunk of params.body as Readable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    this.store.set(params.key, {
      buffer,
      contentType: params.contentType,
    });

    return { size: buffer.length };
  }

  async getObjectStream(
    params: GetObjectStreamParams
  ): Promise<GetObjectStreamResult> {
    const obj = this.store.get(params.key);

    if (!obj) {
      throw new StorageError(`Object not found: ${params.key}`, "NOT_FOUND");
    }

    // 將 Buffer 轉為 Readable stream
    const stream = Readable.from(obj.buffer);

    return {
      stream,
      contentType: obj.contentType,
      contentLength: obj.buffer.length,
    };
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    // 若不存在也視為成功（idempotent）
    this.store.delete(params.key);
  }

  // ============================================================================
  // 測試用輔助方法
  // ============================================================================

  /**
   * 清空所有儲存的物件
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 取得目前儲存的物件數量
   */
  get size(): number {
    return this.store.size;
  }

  /**
   * 檢查某個 key 是否存在
   */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /**
   * 直接取得 Buffer（測試驗證用）
   */
  getBuffer(key: string): Buffer | undefined {
    return this.store.get(key)?.buffer;
  }
}

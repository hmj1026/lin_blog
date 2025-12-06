/**
 * Local Storage Adapter
 *
 * 將檔案存放於本機 `storage/` 目錄，適用於開發環境。
 */

import { createReadStream, existsSync } from "fs";
import { mkdir, writeFile, unlink, stat } from "fs/promises";
import path from "path";
import type { Readable } from "stream";
import type {
  ObjectStorageAdapter,
  PutObjectParams,
  PutObjectResult,
  GetObjectStreamParams,
  GetObjectStreamResult,
  DeleteObjectParams,
} from "./adapter.interface";
import { StorageError } from "./adapter.interface";

export interface LocalStorageAdapterOptions {
  /**
   * Storage 根目錄（絕對路徑或相對於 cwd）
   * 預設為 `<cwd>/storage`
   */
  rootDir?: string;
}

/**
 * 本機檔案系統 Storage Adapter
 */
export class LocalStorageAdapter implements ObjectStorageAdapter {
  readonly provider = "local";
  private readonly rootDir: string;

  constructor(options: LocalStorageAdapterOptions = {}) {
    this.rootDir = options.rootDir ?? path.join(process.cwd(), "storage");
  }

  /**
   * 將 key 轉換為完整檔案路徑
   */
  private resolvePath(key: string): string {
    // 防止 path traversal 攻擊：確保最終路徑在 rootDir 內
    const resolved = path.resolve(this.rootDir, key);
    if (!resolved.startsWith(this.rootDir)) {
      throw new StorageError(
        `Invalid key: path traversal detected (${key})`,
        "PERMISSION"
      );
    }
    return resolved;
  }

  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    const filePath = this.resolvePath(params.key);
    const dir = path.dirname(filePath);

    try {
      // 確保目錄存在
      await mkdir(dir, { recursive: true });

      // 將 body 轉為 Buffer
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

      await writeFile(filePath, buffer);
      return { size: buffer.length };
    } catch (error) {
      throw new StorageError(
        `Failed to write object: ${params.key}`,
        "UNKNOWN",
        error
      );
    }
  }

  async getObjectStream(
    params: GetObjectStreamParams
  ): Promise<GetObjectStreamResult> {
    const filePath = this.resolvePath(params.key);

    if (!existsSync(filePath)) {
      throw new StorageError(
        `Object not found: ${params.key}`,
        "NOT_FOUND"
      );
    }

    try {
      const stats = await stat(filePath);
      const stream = createReadStream(filePath);

      return {
        stream,
        contentLength: stats.size,
        // 無法從檔案系統取得 contentType，由上層處理
      };
    } catch (error) {
      throw new StorageError(
        `Failed to read object: ${params.key}`,
        "UNKNOWN",
        error
      );
    }
  }

  async deleteObject(params: DeleteObjectParams): Promise<void> {
    const filePath = this.resolvePath(params.key);

    // 若檔案不存在，視為成功（idempotent）
    if (!existsSync(filePath)) {
      return;
    }

    try {
      await unlink(filePath);
    } catch (error) {
      throw new StorageError(
        `Failed to delete object: ${params.key}`,
        "UNKNOWN",
        error
      );
    }
  }
}

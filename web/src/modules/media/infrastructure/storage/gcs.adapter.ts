/**
 * Google Cloud Storage Adapter
 *
 * 支援 Google Cloud Storage 物件儲存服務。
 */

import { Storage } from "@google-cloud/storage";
import type { Readable } from "stream";
import {
  type ObjectStorageAdapter,
  type PutObjectParams,
  type PutObjectResult,
  type GetObjectStreamParams,
  type GetObjectStreamResult,
  type DeleteObjectParams,
  StorageError,
} from "./adapter.interface";

/**
 * GCS Adapter 設定
 */
export interface GcsAdapterConfig {
  /** GCS bucket 名稱 */
  bucket: string;
  /** GCP Project ID */
  projectId: string;
  /** Service Account Email */
  clientEmail: string;
  /** Service Account Private Key */
  privateKey: string;
}

/**
 * 將 GCS 錯誤轉換為 StorageError
 */
function toStorageError(error: unknown, operation: string): StorageError {
  if (error instanceof StorageError) {
    return error;
  }

  const err = error as { code?: number | string; message?: string };
  const message = err.message || `${operation} failed`;
  const code = err.code;

  // 判斷錯誤類型
  if (code === 404 || code === "ENOENT") {
    return new StorageError(message, "NOT_FOUND", error);
  }
  if (code === 403 || code === 401) {
    return new StorageError(message, "PERMISSION", error);
  }
  if (code === 500 || code === 503 || code === "ETIMEDOUT" || code === "ECONNRESET") {
    return new StorageError(message, "TEMPORARY", error);
  }

  return new StorageError(message, "UNKNOWN", error);
}

/**
 * Google Cloud Storage Adapter
 *
 * @example
 * ```typescript
 * const adapter = new GcsStorageAdapter({
 *   bucket: "my-bucket",
 *   projectId: "my-project",
 *   clientEmail: "sa@project.iam.gserviceaccount.com",
 *   privateKey: "-----BEGIN PRIVATE KEY-----\n...",
 * });
 * ```
 */
export class GcsStorageAdapter implements ObjectStorageAdapter {
  readonly provider = "gcs";
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(config: GcsAdapterConfig) {
    this.bucketName = config.bucket;

    // 處理 private key（可能包含 \n 字串需要轉換）
    const privateKey = config.privateKey.replace(/\\n/g, "\n");

    this.storage = new Storage({
      projectId: config.projectId,
      credentials: {
        client_email: config.clientEmail,
        private_key: privateKey,
      },
    });
  }

  /**
   * 取得 bucket 實例
   */
  private get bucket() {
    return this.storage.bucket(this.bucketName);
  }

  /**
   * 寫入物件到 GCS
   */
  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    try {
      const file = this.bucket.file(params.key);

      const body = params.body instanceof Buffer
        ? params.body
        : await this.streamToBuffer(params.body as Readable);

      await file.save(body, {
        contentType: params.contentType,
        resumable: false, // 小檔案不需要 resumable upload
      });

      return { size: body.length };
    } catch (error) {
      throw toStorageError(error, "putObject");
    }
  }

  /**
   * 取得物件串流
   */
  async getObjectStream(params: GetObjectStreamParams): Promise<GetObjectStreamResult> {
    try {
      const file = this.bucket.file(params.key);

      // 先檢查檔案是否存在並取得 metadata
      const [exists] = await file.exists();
      if (!exists) {
        throw new StorageError(`Object not found: ${params.key}`, "NOT_FOUND");
      }

      const [metadata] = await file.getMetadata();
      const stream = file.createReadStream();

      return {
        stream: stream as unknown as Readable,
        contentType: metadata.contentType,
        contentLength: metadata.size ? Number(metadata.size) : undefined,
      };
    } catch (error) {
      throw toStorageError(error, "getObjectStream");
    }
  }

  /**
   * 刪除物件
   *
   * 若物件不存在，不拋錯
   */
  async deleteObject(params: DeleteObjectParams): Promise<void> {
    try {
      const file = this.bucket.file(params.key);
      await file.delete({ ignoreNotFound: true });
    } catch (error) {
      const storageError = toStorageError(error, "deleteObject");
      if (storageError.code !== "NOT_FOUND") {
        throw storageError;
      }
    }
  }

  /**
   * 將 Readable stream 轉換為 Buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}

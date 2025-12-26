/**
 * S3 Compatible Storage Adapter
 *
 * 支援 AWS S3、Cloudflare R2、MinIO 等 S3 相容的物件儲存服務。
 * R2 使用 S3 API，只需設定正確的 endpoint 即可。
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
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
 * S3 Compatible Adapter 設定
 */
export interface S3CompatibleAdapterConfig {
  /** S3 bucket 名稱 */
  bucket: string;
  /** S3 region（R2 可填任意值如 "auto"） */
  region?: string;
  /** 自訂 endpoint（R2 必填） */
  endpoint?: string;
  /** Access Key ID */
  accessKeyId: string;
  /** Secret Access Key */
  secretAccessKey: string;
  /** Provider 識別名稱（用於 log） */
  providerName?: string;
}

/**
 * 將 AWS SDK 錯誤轉換為 StorageError
 */
function toStorageError(error: unknown, operation: string): StorageError {
  if (error instanceof StorageError) {
    return error;
  }

  const err = error as { name?: string; $metadata?: { httpStatusCode?: number }; message?: string };
  const statusCode = err.$metadata?.httpStatusCode;
  const message = err.message || `${operation} failed`;

  // 判斷錯誤類型
  if (statusCode === 404 || err.name === "NoSuchKey") {
    return new StorageError(message, "NOT_FOUND", error);
  }
  if (statusCode === 403 || err.name === "AccessDenied") {
    return new StorageError(message, "PERMISSION", error);
  }
  if (statusCode && statusCode >= 500) {
    return new StorageError(message, "TEMPORARY", error);
  }
  if (err.name === "TimeoutError" || err.name === "NetworkingError") {
    return new StorageError(message, "TEMPORARY", error);
  }

  return new StorageError(message, "UNKNOWN", error);
}

/**
 * S3 Compatible Storage Adapter
 *
 * 支援 AWS S3、Cloudflare R2、MinIO 等 S3 相容服務。
 *
 * @example
 * ```typescript
 * // Cloudflare R2
 * const adapter = new S3CompatibleStorageAdapter({
 *   bucket: "my-bucket",
 *   endpoint: "https://<account-id>.r2.cloudflarestorage.com",
 *   accessKeyId: "...",
 *   secretAccessKey: "...",
 *   providerName: "r2",
 * });
 * ```
 */
export class S3CompatibleStorageAdapter implements ObjectStorageAdapter {
  readonly provider: string;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: S3CompatibleAdapterConfig) {
    this.provider = config.providerName || "s3";
    this.bucket = config.bucket;

    const clientConfig: S3ClientConfig = {
      region: config.region || "auto",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    // R2 需要自訂 endpoint
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      // R2 使用 path-style（bucket 在 path 而非 subdomain）
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
  }

  /**
   * 寫入物件到 S3/R2
   */
  async putObject(params: PutObjectParams): Promise<PutObjectResult> {
    try {
      const body = params.body instanceof Buffer
        ? params.body
        : await this.streamToBuffer(params.body as Readable);

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: body,
        ContentType: params.contentType,
      });

      await this.client.send(command);

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
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new StorageError("Empty response body", "NOT_FOUND");
      }

      // AWS SDK v3 回傳的是 Readable | ReadableStream | Blob
      const stream = response.Body as Readable | ReadableStream;

      return {
        stream,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (error) {
      throw toStorageError(error, "getObjectStream");
    }
  }

  /**
   * 刪除物件
   *
   * 若物件不存在，不拋錯（S3 刪除不存在的物件會回傳成功）
   */
  async deleteObject(params: DeleteObjectParams): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
      });

      await this.client.send(command);
    } catch (error) {
      // S3 刪除不存在的物件不會報錯，但其他錯誤需要拋出
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

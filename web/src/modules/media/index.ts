import { createMediaUseCases } from "./application/use-cases";
import type { StoragePort, ImageProcessorPort } from "./application/ports";
import { uploadRepositoryPrisma } from "./infrastructure/prisma/upload.repository.prisma";
import { getStorageAdapter, StorageError } from "./infrastructure/storage";
import { processImage } from "./infrastructure/image-processor";
import { env } from "@/env";
import { mediaReferenceRepositoryPrisma } from "./infrastructure/prisma/media-reference.repository.prisma";

/**
 * StoragePort 介面卡：把 infrastructure 的 StorageError 翻譯成 application 層的離散結果，
 * 讓 use-case 完全不需 import 任何 infrastructure。非 StorageError 一律往上拋（維持 500）。
 */
const storagePort: StoragePort = {
  async putObject(params) {
    try {
      await getStorageAdapter().putObject(params);
      return { ok: true };
    } catch (error) {
      if (error instanceof StorageError) {
        return { ok: false, retryable: error.isRetryable, message: error.message };
      }
      throw error;
    }
  },
  async getObjectStream(params) {
    try {
      const result = await getStorageAdapter().getObjectStream(params);
      return { ok: true, stream: result.stream, contentType: result.contentType, contentLength: result.contentLength };
    } catch (error) {
      if (error instanceof StorageError && error.code === "NOT_FOUND") {
        return { ok: false, reason: "not-found" };
      }
      throw error;
    }
  },
};

/**
 * ImageProcessorPort 介面卡：於組合根綁定壓縮設定（env），use-case 僅需傳入 buffer / mimeType。
 */
const imageProcessorPort: ImageProcessorPort = {
  process: (buffer, mimeType) =>
    processImage(buffer, mimeType, {
      enabled: env.UPLOAD_IMAGE_COMPRESSION,
      maxWidth: env.UPLOAD_IMAGE_MAX_WIDTH,
      quality: env.UPLOAD_IMAGE_QUALITY,
    }),
};

export const mediaUseCases = createMediaUseCases({
  uploads: uploadRepositoryPrisma,
  storage: storagePort,
  imageProcessor: imageProcessorPort,
  references: mediaReferenceRepositoryPrisma,
});

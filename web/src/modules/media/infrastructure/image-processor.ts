/**
 * 圖片處理模組
 *
 * 使用 Sharp 進行圖片壓縮和格式轉換，降低檔案大小和流量成本。
 */

import sharp from "sharp";

/**
 * 圖片處理選項
 */
export interface ImageProcessorOptions {
  /** 是否啟用壓縮 */
  enabled: boolean;
  /** 圖片最大寬度（超過則縮小，不放大） */
  maxWidth: number;
  /** 壓縮品質 1-100 */
  quality: number;
}

/**
 * 圖片處理結果
 */
export interface ImageProcessResult {
  /** 處理後的 buffer */
  buffer: Buffer;
  /** 處理後的 MIME type */
  mimeType: string;
}

/**
 * 支援壓縮的圖片 MIME types
 */
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/**
 * 檢查是否為支援壓縮的圖片類型
 */
export function isSupportedImageType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.has(mimeType.toLowerCase());
}

/**
 * 處理圖片：壓縮、調整尺寸、轉換格式
 *
 * - 若壓縮關閉或非支援的圖片類型，直接回傳原始 buffer
 * - 自動調整尺寸（不放大）
 * - 輸出為 WebP 格式（更小的檔案大小）
 *
 * @param buffer - 原始圖片 buffer
 * @param mimeType - 原始 MIME type
 * @param options - 處理選項
 * @returns 處理後的結果
 */
export async function processImage(
  buffer: Buffer,
  mimeType: string,
  options: ImageProcessorOptions
): Promise<ImageProcessResult> {
  // 若壓縮關閉，直接回傳
  if (!options.enabled) {
    return { buffer, mimeType };
  }

  // 若非支援的圖片類型，直接回傳
  if (!isSupportedImageType(mimeType)) {
    return { buffer, mimeType };
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // 建立處理 pipeline
    let pipeline = image;

    // 調整尺寸（只縮小，不放大）
    if (metadata.width && metadata.width > options.maxWidth) {
      pipeline = pipeline.resize(options.maxWidth, null, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // 轉換為 WebP 格式（更好的壓縮率）
    const outputBuffer = await pipeline
      .webp({ quality: options.quality })
      .toBuffer();

    return {
      buffer: outputBuffer,
      mimeType: "image/webp",
    };
  } catch (error) {
    // 處理失敗時回傳原始圖片，避免阻擋上傳
    console.warn("[ImageProcessor] 圖片處理失敗，使用原始檔案:", error);
    return { buffer, mimeType };
  }
}

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock sharp before importing the module
vi.mock("sharp", () => {
  const mockSharp = vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({ width: 2000, height: 1500 }),
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from("compressed-image")),
  }));
  return { default: mockSharp };
});

import {
  processImage,
  isSupportedImageType,
  type ImageProcessorOptions,
} from "@/modules/media/infrastructure/image-processor";

describe("Image Processor", () => {
  const defaultOptions: ImageProcessorOptions = {
    enabled: true,
    maxWidth: 1920,
    quality: 85,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isSupportedImageType", () => {
    it("JPEG 為支援的類型", () => {
      expect(isSupportedImageType("image/jpeg")).toBe(true);
      expect(isSupportedImageType("image/jpg")).toBe(true);
    });

    it("PNG 為支援的類型", () => {
      expect(isSupportedImageType("image/png")).toBe(true);
    });

    it("WebP 為支援的類型", () => {
      expect(isSupportedImageType("image/webp")).toBe(true);
    });

    it("PDF 不為支援的類型", () => {
      expect(isSupportedImageType("application/pdf")).toBe(false);
    });

    it("文字檔不為支援的類型", () => {
      expect(isSupportedImageType("text/plain")).toBe(false);
    });
  });

  describe("processImage", () => {
    it("壓縮功能關閉時直接回傳原始 buffer", async () => {
      const buffer = Buffer.from("original-image");
      const mimeType = "image/jpeg";

      const result = await processImage(buffer, mimeType, {
        ...defaultOptions,
        enabled: false,
      });

      expect(result.buffer).toBe(buffer);
      expect(result.mimeType).toBe(mimeType);
    });

    it("非圖片類型直接回傳原始 buffer", async () => {
      const buffer = Buffer.from("pdf-content");
      const mimeType = "application/pdf";

      const result = await processImage(buffer, mimeType, defaultOptions);

      expect(result.buffer).toBe(buffer);
      expect(result.mimeType).toBe(mimeType);
    });

    it("圖片類型進行壓縮處理", async () => {
      const buffer = Buffer.from("original-image");
      const mimeType = "image/jpeg";

      const result = await processImage(buffer, mimeType, defaultOptions);

      expect(result.mimeType).toBe("image/webp");
      expect(result.buffer.toString()).toBe("compressed-image");
    });

    it("PNG 圖片轉換為 WebP", async () => {
      const buffer = Buffer.from("png-image");
      const mimeType = "image/png";

      const result = await processImage(buffer, mimeType, defaultOptions);

      expect(result.mimeType).toBe("image/webp");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/uploads/route";
import { DELETE } from "@/app/api/uploads/[id]/route";
import { mediaUseCases } from "@/modules/media";
import { requirePermission } from "@/lib/api-utils";
import { getStorageAdapter, StorageError } from "@/modules/media/infrastructure/storage";
import { processImage } from "@/modules/media/infrastructure/image-processor";
import { NextResponse } from "next/server";

// Mock dependencies
vi.mock("@/modules/media", () => ({
  mediaUseCases: {
    listUploads: vi.fn(),
    createUpload: vi.fn(),
    softDeleteUpload: vi.fn(),
  },
}));

vi.mock("@/modules/media/infrastructure/storage", () => ({
  getStorageAdapter: vi.fn(),
  StorageError: class extends Error {
    isRetryable: boolean;
    constructor(msg: string, isRetryable = false) {
      super(msg);
      this.isRetryable = isRetryable;
    }
  },
}));

vi.mock("@/modules/media/infrastructure/image-processor", () => ({
  processImage: vi.fn(),
}));

vi.mock("@/lib/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-utils")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
  };
});

// Mock env
vi.mock("@/env", () => ({
  env: {
    UPLOAD_MAX_FILE_SIZE_MB: 5,
    UPLOAD_IMAGE_COMPRESSION: true,
    UPLOAD_IMAGE_MAX_WIDTH: 1920,
    UPLOAD_IMAGE_QUALITY: 80,
  },
}));

describe("API: /api/uploads", () => {
  const mockStorage = {
    putObject: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getStorageAdapter as any).mockReturnValue(mockStorage);
  });

  describe("GET", () => {
    it("returns uploads list", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (mediaUseCases.listUploads as any).mockResolvedValue([
        { 
          id: "1", 
          originalName: "file.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      const request = new Request("http://localhost/api/uploads?search=test");
      const response = await GET(request as any);
      await response.json(); // Don't check json structure strictly if not needed, or check success status

      expect(response.status).toBe(200);
      expect(mediaUseCases.listUploads).toHaveBeenCalledWith(expect.objectContaining({ search: "test" }));
    });
  });

  describe("POST", () => {
    it("uploads file successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      
      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      // Mock arrayBuffer since jsdom/node File might not have it or we want to control it
      Object.defineProperty(file, "arrayBuffer", {
        value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      const formData = new FormData();
      formData.append("file", file);

      // Mock processing
      (processImage as any).mockResolvedValue({
        buffer: Buffer.from("processed"),
        mimeType: "image/jpeg",
        width: 100,
        height: 100,
      });

      // Mock DB creation
      (mediaUseCases.createUpload as any).mockResolvedValue({ id: "123" });

      // Mock Request
      const request = {
        formData: async () => ({
           get: (key: string) => (key === "file" ? file : null),
        }),
      };

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(processImage).toHaveBeenCalled();
      expect(mockStorage.putObject).toHaveBeenCalled();
      expect(mediaUseCases.createUpload).toHaveBeenCalled();
      expect(json.data.id).toBe("123");
    });

    it("returns 400 if no file", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const request = { 
        formData: async () => ({
           get: () => null
        }) 
      };

      const response = await POST(request as any);
      expect(response.status).toBe(400);
    });

    it("returns 413 if file too large", async () => {
      (requirePermission as any).mockResolvedValue(null);
      
      const largeFile = new File([""], "large.jpg", { type: "image/jpeg" });
      // Overwrite size property
      Object.defineProperty(largeFile, "size", { value: 10 * 1024 * 1024 + 1 });

      const request = { 
        formData: async () => ({
            get: (key: string) => (key === "file" ? largeFile : null)
        }) 
      };

      const response = await POST(request as any);
      expect(response.status).toBe(413);
    });

    it("handles storage error", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "arrayBuffer", {
        value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      });

      // Mock processing
      (processImage as any).mockResolvedValue({
        buffer: Buffer.from("processed"),
        mimeType: "image/jpeg",
      });

      mockStorage.putObject.mockRejectedValue(new StorageError("S3 Error", true));

      const request = { 
        formData: async () => ({
            get: (key: string) => (key === "file" ? file : null)
        }) 
      };

      const response = await POST(request as any);
      
      expect(response.status).toBe(503);
    });
  });
});

describe("API: /api/uploads/[id]", () => {
  const context = { params: Promise.resolve({ id: "1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DELETE", () => {
    it("deletes upload", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (mediaUseCases.softDeleteUpload as any).mockResolvedValue({ ok: true });

      const request = new Request("http://localhost/api/uploads/1", { method: "DELETE" });
      const response = await DELETE(request, context);
      
      expect(response.status).toBe(200);
      expect(mediaUseCases.softDeleteUpload).toHaveBeenCalledWith("1");
    });

    it("returns 404 if not found", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (mediaUseCases.softDeleteUpload as any).mockResolvedValue({ ok: false });

      const request = new Request("http://localhost/api/uploads/1", { method: "DELETE" });
      const response = await DELETE(request, context);
      
      expect(response.status).toBe(404);
    });
  });
});

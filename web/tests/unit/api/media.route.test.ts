import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/uploads/route";
import { GET as getUploadImpact, DELETE } from "@/app/api/uploads/[id]/route";
import { mediaUseCases } from "@/modules/media";
import { requirePermission } from "@/lib/api-utils";

vi.mock("@/lib/server/audit-safe", () => ({ recordAuditEventSafely: vi.fn().mockResolvedValue(true) }));

// Mock dependencies
vi.mock("@/modules/media", () => ({
  mediaUseCases: {
    listUploads: vi.fn(),
    listUploadsPage: vi.fn(),
    uploadFile: vi.fn(),
    softDeleteUpload: vi.fn(),
    getUploadDeletionImpact: vi.fn(),
  },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns a bounded paginated uploads list", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (mediaUseCases.listUploadsPage as any).mockResolvedValue({
        items: [{
          id: "1", 
          originalName: "file.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          createdAt: new Date(),
          updatedAt: new Date()
        }],
        page: 2,
        pageSize: 20,
        total: 21,
        totalPages: 2,
      });

      const request = new Request("http://localhost/api/uploads?q=test&type=image%2F&page=2&pageSize=20");
      const response = await GET(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(mediaUseCases.listUploadsPage).toHaveBeenCalledWith({ search: "test", type: "image/", page: 2, pageSize: 20 });
      expect(json.data).toEqual(expect.objectContaining({ page: 2, total: 21, items: [expect.objectContaining({ src: "/api/files/1" })] }));
    });
  });

  describe("POST", () => {
    it("uploads file successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
      Object.defineProperty(file, "arrayBuffer", { value: vi.fn().mockResolvedValue(new ArrayBuffer(8)) });

      (mediaUseCases.uploadFile as any).mockResolvedValue({ ok: true, id: "123", src: "/api/files/123" });

      const request = { formData: async () => ({ get: (key: string) => (key === "file" ? file : null) }) };

      const response = await POST(request as any);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(mediaUseCases.uploadFile).toHaveBeenCalled();
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
      Object.defineProperty(file, "arrayBuffer", { value: vi.fn().mockResolvedValue(new ArrayBuffer(8)) });

      (mediaUseCases.uploadFile as any).mockResolvedValue({ ok: false, error: "storage", retryable: true, message: "S3 Error" });

      const request = { formData: async () => ({ get: (key: string) => (key === "file" ? file : null) }) };

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

    it("returns 409 when the upload is still referenced", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (mediaUseCases.softDeleteUpload as any).mockResolvedValue({
        ok: false,
        error: "referenced",
        references: [{ label: "文章封面" }],
      });

      const response = await DELETE(new Request("http://localhost/api/uploads/1", { method: "DELETE" }), context);

      expect(response.status).toBe(409);
    });
  });

  it("returns structured reference impact", async () => {
    (requirePermission as any).mockResolvedValue(null);
    (mediaUseCases.getUploadDeletionImpact as any).mockResolvedValue({
      ok: true,
      upload: { id: "1", originalName: "image.jpg" },
      references: [],
    });

    const response = await getUploadImpact(new Request("http://localhost/api/uploads/1"), context);

    expect(response.status).toBe(200);
    expect(mediaUseCases.getUploadDeletionImpact).toHaveBeenCalledWith("1");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/posts/batch/route";
import { GET } from "@/app/api/posts/export/route";
import { requirePermission } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    batchPostAction: vi.fn(),
    exportPosts: vi.fn(),
  },
}));

describe("Posts Batch/Export API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("POST /api/posts/batch", () => {
    it("should return 401 if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/posts/batch", {
        method: "POST",
        body: JSON.stringify({ action: "publish", postIds: ["1"] }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 if missing action or postIds", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/posts/batch", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("缺少");
    });

    it("should handle publish action", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.batchPostAction as any).mockResolvedValue({ count: 2 });

      const req = new NextRequest("http://localhost/api/posts/batch", {
        method: "POST",
        body: JSON.stringify({ action: "publish", postIds: ["1", "2"] }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.count).toBe(2);
    });

    it("should handle draft action", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.batchPostAction as any).mockResolvedValue({ count: 1 });

      const req = new NextRequest("http://localhost/api/posts/batch", {
        method: "POST",
        body: JSON.stringify({ action: "draft", postIds: ["1"] }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should handle delete action", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.batchPostAction as any).mockResolvedValue({ count: 3 });

      const req = new NextRequest("http://localhost/api/posts/batch", {
        method: "POST",
        body: JSON.stringify({ action: "delete", postIds: ["1", "2", "3"] }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("should return 400 for unsupported action", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/posts/batch", {
        method: "POST",
        body: JSON.stringify({ action: "invalid", postIds: ["1"] }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should handle errors gracefully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.batchPostAction as any).mockRejectedValue(new Error("DB error"));

      const req = new NextRequest("http://localhost/api/posts/batch", {
        method: "POST",
        body: JSON.stringify({ action: "publish", postIds: ["1"] }),
      });

      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("GET /api/posts/export", () => {
    const mockPosts = [
      {
        slug: "test-post",
        title: "Test Post",
        excerpt: "Excerpt",
        content: "<p>Content</p>",
        coverImage: null,
        readingTime: "5 min",
        featured: false,
        status: "PUBLISHED",
        publishedAt: new Date("2024-01-01"),
        seoTitle: null,
        seoDescription: null,
        ogImage: null,
        categories: [{ slug: "tech" }],
        tags: [{ slug: "react" }],
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
    ];

    it("should return 401 if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      const req = new NextRequest("http://localhost/api/posts/export");
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it("should export posts as JSON", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.exportPosts as any).mockResolvedValue(mockPosts);

      const req = new NextRequest("http://localhost/api/posts/export?format=json");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("application/json");
      expect(res.headers.get("Content-Disposition")).toContain("attachment");
    });

    it("should export posts as Markdown", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.exportPosts as any).mockResolvedValue(mockPosts);

      const req = new NextRequest("http://localhost/api/posts/export?format=markdown");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/markdown");
    });

    it("should export specific posts by IDs", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.exportPosts as any).mockResolvedValue(mockPosts);

      const req = new NextRequest("http://localhost/api/posts/export?ids=id1,id2");
      await GET(req);

      expect(postsUseCases.exportPosts).toHaveBeenCalledWith({ ids: ["id1", "id2"] });
    });

    it("should handle posts without publishedAt", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const postsNoPub = [{ ...mockPosts[0], publishedAt: null }];
      (postsUseCases.exportPosts as any).mockResolvedValue(postsNoPub);

      const req = new NextRequest("http://localhost/api/posts/export?format=json");
      const res = await GET(req);

      expect(res.status).toBe(200);
    });
  });
});

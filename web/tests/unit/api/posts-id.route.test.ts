import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, PATCH, DELETE } from "@/app/api/posts/[id]/route";
import { postsUseCases } from "@/modules/posts";
import { requirePermission } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    getPostById: vi.fn(),
    updatePostWithVersion: vi.fn(),
    updatePost: vi.fn(),
    removePost: vi.fn(),
  },
}));

vi.mock("@/lib/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-utils")>();
  return {
    ...actual,
    requirePermission: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

describe("API: /api/posts/[id]", () => {
  const context = { params: Promise.resolve({ id: "post-1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns post if found", async () => {
      (postsUseCases.getPostById as any).mockResolvedValue({ id: "post-1", title: "Test" });
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.title).toBe("Test");
    });

    it("returns 404 if not found", async () => {
      (postsUseCases.getPostById as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      const json = await res.json();
      expect(res.status).toBe(404);
    });
  });

  describe("PUT", () => {
    it("returns auth error", async () => {
      (requirePermission as any).mockResolvedValue(new Response("Forbidden", { status: 403 }));
      const req = new NextRequest("http://localhost", { method: "PUT" });
      const res = await PUT(req, context);
      expect(res.status).toBe(403);
    });

    it("updates post with version", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (getSession as any).mockResolvedValue({ user: { id: "user-1" } });
      (postsUseCases.updatePostWithVersion as any).mockResolvedValue({ id: "post-1" });

      const payload = { 
        slug: "slug", title: "Title", content: "Content", excerpt: "Excerpt", status: "PUBLISHED",
        readingTime: "5 min", publishedAt: new Date().toISOString()
      };
      
      const req = new NextRequest("http://localhost", { 
        method: "PUT",
        body: JSON.stringify(payload)
      });
      
      const res = await PUT(req, context);
      expect(res.status).toBe(200);
      expect(postsUseCases.updatePostWithVersion).toHaveBeenCalledWith("post-1", expect.anything(), "user-1");
    });

    it("returns validation error", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost", { 
        method: "PUT",
        body: JSON.stringify({}) // Invalid
      });
      const res = await PUT(req, context);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH", () => {
    it("updates featured status", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.getPostById as any).mockResolvedValue({ 
        id: "post-1", 
        categories: [], tags: [], featured: false 
      });
      
      const req = new NextRequest("http://localhost", { 
        method: "PATCH",
        body: JSON.stringify({ featured: true })
      });
      
      const res = await PATCH(req, context);
      expect(res.status).toBe(200);
      expect(postsUseCases.updatePost).toHaveBeenCalledWith("post-1", expect.objectContaining({
        featured: true
      }));
    });

    it("returns error for unsupported patch", async () => {
      (requirePermission as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost", { 
        method: "PATCH",
        body: JSON.stringify({ unknown: 123 })
      });
      const res = await PATCH(req, context);
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("removes post", async () => {
      (requirePermission as any).mockResolvedValue(null);
      
      const req = new NextRequest("http://localhost", { method: "DELETE" });
      const res = await DELETE(req, context);
      
      expect(res.status).toBe(200);
      expect(postsUseCases.removePost).toHaveBeenCalledWith("post-1");
    });
  });
});

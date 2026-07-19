import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/server/audit-safe", () => ({ recordAuditEventSafely: vi.fn().mockResolvedValue(true) }));
import { GET, PUT, PATCH, DELETE } from "@/app/api/posts/[id]/route";
import { postsQueries } from "@/lib/server-queries";
import { postsUseCases } from "@/modules/posts";
import { requirePermission } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";
import { NextRequest } from "next/server";

vi.mock("@/lib/server-queries", () => ({
  postsQueries: {
    getPostById: vi.fn(),
  },
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    updatePostWithVersion: vi.fn(),
    updatePost: vi.fn(),
    removePost: vi.fn(),
    restorePost: vi.fn(),
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
    const draft = {
      id: "post-1", slug: "s", title: "T", excerpt: "e", content: "c", coverImage: null,
      readingTime: null, featured: false, status: "DRAFT", publishedAt: null, seoTitle: null,
      seoDescription: null, ogImage: null, createdAt: new Date(), updatedAt: new Date(),
      author: { id: "u1", name: "A", email: "a@x.com", password: "$2b$hash", deletedAt: null },
      categories: [], tags: [],
    };
    const scheduled = { ...draft, status: "SCHEDULED" };
    const published = { ...draft, status: "PUBLISHED" };

    it("anon reads DRAFT -> 404", async () => {
      (postsQueries.getPostById as any).mockResolvedValue(draft);
      (requirePermission as any).mockResolvedValue(new Response(null, { status: 403 }));
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      expect(res.status).toBe(404);
    });

    it("anon reads SCHEDULED -> 404", async () => {
      (postsQueries.getPostById as any).mockResolvedValue(scheduled);
      (requirePermission as any).mockResolvedValue(new Response(null, { status: 403 }));
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      expect(res.status).toBe(404);
    });

    it("authed without permission reads DRAFT -> 404", async () => {
      (postsQueries.getPostById as any).mockResolvedValue(draft);
      (requirePermission as any).mockResolvedValue(new Response(null, { status: 403 }));
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      expect(res.status).toBe(404);
    });

    it("authed with permission reads DRAFT -> 200", async () => {
      (postsQueries.getPostById as any).mockResolvedValue(draft);
      (requirePermission as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.data.title).toBe("T");
    });

    it("anyone reads PUBLISHED -> 200 without checking permission", async () => {
      (postsQueries.getPostById as any).mockResolvedValue(published);
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(requirePermission).not.toHaveBeenCalled();
      expect(json.data.title).toBe("T");
    });

    it("PUBLISHED response omits author credentials", async () => {
      (postsQueries.getPostById as any).mockResolvedValue(published);
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      const json = await res.json();
      expect(json.data.author).toEqual({ id: "u1", name: "A" });
      expect(json.data.author.password).toBeUndefined();
      expect(json.data.author.email).toBeUndefined();
    });

    it("returns 404 if not found", async () => {
      (postsQueries.getPostById as any).mockResolvedValue(null);
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      const json = await res.json();
      expect(res.status).toBe(404);
    });

    it("returns showRawHtmlToc when present on the record", async () => {
      (postsQueries.getPostById as any).mockResolvedValue({ ...published, showRawHtmlToc: true });
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      const json = await res.json();
      expect(json.data.showRawHtmlToc).toBe(true);
    });

    it("defaults showRawHtmlToc to false when missing on the record", async () => {
      (postsQueries.getPostById as any).mockResolvedValue(published);
      const req = new NextRequest("http://localhost/api/posts/post-1");
      const res = await GET(req, context);
      const json = await res.json();
      expect(json.data.showRawHtmlToc).toBe(false);
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
      (postsUseCases.updatePostWithVersion as any).mockResolvedValue({ ok: true, id: "post-1", updatedAt: new Date() });

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

    it("passes showRawHtmlToc through to updatePostWithVersion", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (getSession as any).mockResolvedValue({ user: { id: "user-1" } });
      (postsUseCases.updatePostWithVersion as any).mockResolvedValue({ ok: true, id: "post-1", updatedAt: new Date() });

      const payload = {
        slug: "slug", title: "Title", content: "Content", excerpt: "Excerpt", status: "PUBLISHED",
        readingTime: "5 min", publishedAt: new Date().toISOString(),
        showRawHtmlToc: true,
      };

      const req = new NextRequest("http://localhost", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      await PUT(req, context);

      expect(postsUseCases.updatePostWithVersion).toHaveBeenCalledWith(
        "post-1",
        expect.objectContaining({ showRawHtmlToc: true }),
        "user-1"
      );
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

    it("returns 409 when the update conflicts with a concurrent edit", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (getSession as any).mockResolvedValue({ user: { id: "user-1" } });
      (postsUseCases.updatePostWithVersion as any).mockResolvedValue({ ok: false, reason: "conflict" });

      const payload = {
        slug: "slug", title: "Title", content: "Content", excerpt: "Excerpt", status: "PUBLISHED",
        readingTime: "5 min", publishedAt: new Date().toISOString(),
      };
      const req = new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify(payload) });
      const res = await PUT(req, context);
      expect(res.status).toBe(409);
    });

    it("returns 404 when the post to update no longer exists", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (getSession as any).mockResolvedValue({ user: { id: "user-1" } });
      (postsUseCases.updatePostWithVersion as any).mockResolvedValue({ ok: false, reason: "not-found" });

      const payload = {
        slug: "slug", title: "Title", content: "Content", excerpt: "Excerpt", status: "PUBLISHED",
        readingTime: "5 min", publishedAt: new Date().toISOString(),
      };
      const req = new NextRequest("http://localhost", { method: "PUT", body: JSON.stringify(payload) });
      const res = await PUT(req, context);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH", () => {
    it("restores a soft-deleted post", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost", {
        method: "PATCH",
        body: JSON.stringify({ restore: true }),
      });

      const res = await PATCH(req, context);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.restored).toBe(true);
      expect(postsUseCases.restorePost).toHaveBeenCalledWith("post-1");
    });

    it("updates featured status", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsQueries.getPostById as any).mockResolvedValue({ 
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

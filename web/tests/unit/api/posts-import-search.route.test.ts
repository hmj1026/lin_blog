import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/posts/import/route";
import { GET } from "@/app/api/search/route";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
  jsonOk: vi.fn((data) => Response.json({ success: true, data })),
  jsonError: vi.fn((msg, status) => Response.json({ success: false, message: msg }, { status })),
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    importPosts: vi.fn(),
    searchPosts: vi.fn(),
  },
}));

describe("Posts Import API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/posts/import", () => {
    it("should return auth error if not authorized", async () => {
      (requirePermission as any).mockResolvedValue(
        Response.json({ success: false }, { status: 401 })
      );

      const req = new Request("http://localhost/api/posts/import", {
        method: "POST",
        body: JSON.stringify({ posts: [] }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 if no posts provided", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const req = new Request("http://localhost/api/posts/import", {
        method: "POST",
        body: JSON.stringify({ posts: [] }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should import posts successfully", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.importPosts as any).mockResolvedValue({
        created: 2,
        updated: 0,
        skipped: 0,
        errors: [],
      });

      const req = new Request("http://localhost/api/posts/import", {
        method: "POST",
        body: JSON.stringify({
          posts: [
            { slug: "p1", title: "t1", excerpt: "e1", content: "c1" },
            { slug: "p2", title: "t2", excerpt: "e2", content: "c2" },
          ],
          mode: "skip",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
    });

    it("should handle overwrite mode", async () => {
      (requirePermission as any).mockResolvedValue(null);
      (postsUseCases.importPosts as any).mockResolvedValue({
        created: 0,
        updated: 1,
        skipped: 0,
        errors: [],
      });

      const req = new Request("http://localhost/api/posts/import", {
        method: "POST",
        body: JSON.stringify({
          posts: [{ slug: "p1", title: "t1", excerpt: "e1", content: "c1" }],
          mode: "overwrite",
        }),
      });

      await POST(req);
      expect(postsUseCases.importPosts).toHaveBeenCalledWith(
        expect.objectContaining({ mode: "overwrite" })
      );
    });

    it("should handle invalid JSON", async () => {
      (requirePermission as any).mockResolvedValue(null);

      const req = new Request("http://localhost/api/posts/import", {
        method: "POST",
        body: "{ invalid json }",
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});

describe("Search API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/search", () => {
    it("should return empty array for empty query", async () => {
      const req = new NextRequest("http://localhost/api/search?q=");
      await GET(req);

      expect(jsonOk).toHaveBeenCalledWith([]);
    });

    it("should return empty array for whitespace query", async () => {
      const req = new NextRequest("http://localhost/api/search?q=   ");
      await GET(req);

      expect(jsonOk).toHaveBeenCalledWith([]);
    });

    it("should search posts with query", async () => {
      (postsUseCases.searchPosts as any).mockResolvedValue([
        {
          slug: "test",
          title: "Test Post",
          excerpt: "Excerpt",
          coverImage: null,
          publishedAt: new Date("2024-01-01"),
          categories: [{ name: "Tech" }],
        },
      ]);

      const req = new NextRequest("http://localhost/api/search?q=test");
      await GET(req);

      expect(postsUseCases.searchPosts).toHaveBeenCalledWith({ query: "test", take: 20 });
      expect(jsonOk).toHaveBeenCalled();
    });

    it("should handle posts without categories", async () => {
      (postsUseCases.searchPosts as any).mockResolvedValue([
        {
          slug: "test",
          title: "Test",
          excerpt: "Excerpt",
          coverImage: null,
          publishedAt: null,
          categories: [],
        },
      ]);

      const req = new NextRequest("http://localhost/api/search?q=test");
      await GET(req);

      expect(jsonOk).toHaveBeenCalled();
    });
  });
});

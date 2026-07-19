import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/server/audit-safe", () => ({ recordAuditEventSafely: vi.fn().mockResolvedValue(true) }));
import { POST } from "@/app/api/posts/import/route";
import { GET } from "@/app/api/search/route";
import { requirePermission, jsonOk, jsonError } from "@/lib/api-utils";
import { postsQueries, discoveryQueries } from "@/lib/server-queries";
import { postsUseCases } from "@/modules/posts";
import { NextRequest } from "next/server";

vi.mock("@/lib/api-utils", () => ({
  requirePermission: vi.fn(),
  jsonOk: vi.fn((data) => Response.json({ success: true, data })),
  jsonError: vi.fn((msg, status) => Response.json({ success: false, message: msg }, { status })),
}));

vi.mock("@/lib/server-queries", () => ({
  postsQueries: {
    searchPosts: vi.fn(),
  },
  discoveryQueries: {
    searchPublicPosts: vi.fn(),
  },
}));

vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    importPosts: vi.fn(),
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
    it("returns an empty bounded result for an empty query without querying", async () => {
      (discoveryQueries.searchPublicPosts as any).mockResolvedValue({ kind: "empty-query", query: "" });
      const req = new NextRequest("http://localhost/api/search?q=");
      await GET(req);

      expect(jsonOk).toHaveBeenCalledWith({ items: [], total: 0, page: 1, pageSize: 10 });
    });

    it("returns an empty bounded result for a whitespace query", async () => {
      (discoveryQueries.searchPublicPosts as any).mockResolvedValue({ kind: "empty-query", query: "" });
      const req = new NextRequest("http://localhost/api/search?q=   ");
      await GET(req);

      expect(jsonOk).toHaveBeenCalledWith({ items: [], total: 0, page: 1, pageSize: 10 });
    });

    it("wires the search to discoveryQueries.searchPublicPosts, passing the page, and returns the bounded envelope", async () => {
      (discoveryQueries.searchPublicPosts as any).mockResolvedValue({
        kind: "results",
        query: "test",
        page: 2,
        pageSize: 10,
        total: 21,
        items: [{ slug: "test", title: "Test Post", excerpt: "Excerpt", coverImage: null, publishedAt: null, category: "Tech" }],
      });

      const req = new NextRequest("http://localhost/api/search?q=test&page=2");
      await GET(req);

      // The bug this regresses: the route must consume the bounded-pagination use case, not the old fixed take:20 query.
      expect(discoveryQueries.searchPublicPosts).toHaveBeenCalledWith({ query: "test", page: 2 });
      expect(postsQueries.searchPosts).not.toHaveBeenCalled();
      expect(jsonOk).toHaveBeenCalledWith({
        items: [{ slug: "test", title: "Test Post", excerpt: "Excerpt", coverImage: null, publishedAt: null, category: "Tech" }],
        total: 21,
        page: 2,
        pageSize: 10,
      });
    });

    it("defaults to page 1 when no page param is provided", async () => {
      (discoveryQueries.searchPublicPosts as any).mockResolvedValue({
        kind: "results",
        query: "test",
        page: 1,
        pageSize: 10,
        total: 0,
        items: [],
      });

      const req = new NextRequest("http://localhost/api/search?q=test");
      await GET(req);

      expect(discoveryQueries.searchPublicPosts).toHaveBeenCalledWith({ query: "test", page: 1 });
    });

    it.each(["2junk", "2.9", "1e2"])(
      "defaults malformed page %s to page 1",
      async (page) => {
        (discoveryQueries.searchPublicPosts as any).mockResolvedValue({
          kind: "results",
          query: "test",
          page: 1,
          pageSize: 10,
          total: 0,
          items: [],
        });

        const req = new NextRequest(`http://localhost/api/search?q=test&page=${page}`);
        await GET(req);

        expect(discoveryQueries.searchPublicPosts).toHaveBeenCalledWith({ query: "test", page: 1 });
      }
    );

    it("returns a generic 503 error (not a fake empty result) when the discovery query is temporarily unavailable", async () => {
      // 呼叫端必須能區分「沒有結果」與「服務故障」；錯誤不得偽裝成 200 空結果
      (discoveryQueries.searchPublicPosts as any).mockResolvedValue({ kind: "error", query: "test" });
      const req = new NextRequest("http://localhost/api/search?q=test");
      const res = await GET(req);

      expect(jsonOk).not.toHaveBeenCalled();
      expect(jsonError).toHaveBeenCalledWith("搜尋服務暫時無法使用，請稍後再試", 503);
      expect(res.status).toBe(503);
    });
  });
});

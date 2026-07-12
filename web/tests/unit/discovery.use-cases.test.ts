import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDiscoveryUseCases } from "@/modules/discovery/application/use-cases";
import type {
  DiscoveryAnalyticsPort,
  DiscoveryPostsPort,
  PostSourceRecord,
} from "@/modules/discovery/application/ports";

function makePost(overrides: Partial<PostSourceRecord>): PostSourceRecord {
  return {
    id: "id",
    slug: "slug",
    title: "title",
    excerpt: "excerpt",
    coverImage: null,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    category: null,
    ...overrides,
  };
}

describe("discovery use cases", () => {
  const posts: DiscoveryPostsPort = {
    searchPublished: vi.fn(),
    listLatestPublished: vi.fn(),
  };
  const analytics: DiscoveryAnalyticsPort = {
    listPopularPublishedSince: vi.fn(),
  };

  const useCases = createDiscoveryUseCases({ posts, analytics });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchPublicPosts", () => {
    it("returns an empty-query result without calling the repository when query is blank", async () => {
      const result = await useCases.searchPublicPosts({ query: "   " });
      expect(result.kind).toBe("empty-query");
      expect(posts.searchPublished).not.toHaveBeenCalled();
    });

    it("trims the query before searching", async () => {
      (posts.searchPublished as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
      await useCases.searchPublicPosts({ query: "  hello  " });
      const call = (posts.searchPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.query).toBe("hello");
    });

    it("clamps page to a minimum of 1", async () => {
      (posts.searchPublished as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
      await useCases.searchPublicPosts({ query: "a", page: 0 });
      const call = (posts.searchPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.page).toBe(1);
    });

    it("clamps page to a defensive maximum to bound the resulting skip", async () => {
      (posts.searchPublished as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
      await useCases.searchPublicPosts({ query: "a", page: 999999 });
      const call = (posts.searchPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.page).toBe(10000);
    });

    it("clamps pageSize to a maximum of 20", async () => {
      (posts.searchPublished as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
      await useCases.searchPublicPosts({ query: "a", pageSize: 999 });
      const call = (posts.searchPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.pageSize).toBe(20);
    });

    it("falls back to the minimum page when page is not a finite number", async () => {
      (posts.searchPublished as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
      await useCases.searchPublicPosts({ query: "a", page: Number.NaN });
      const call = (posts.searchPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.page).toBe(1);
    });

    it("falls back to the minimum pageSize when pageSize is infinite", async () => {
      (posts.searchPublished as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
      await useCases.searchPublicPosts({ query: "a", pageSize: Number.POSITIVE_INFINITY });
      const call = (posts.searchPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.pageSize).toBe(1);
    });

    it("defaults pageSize to 10 when not provided", async () => {
      (posts.searchPublished as ReturnType<typeof vi.fn>).mockResolvedValue({ items: [], total: 0 });
      await useCases.searchPublicPosts({ query: "a" });
      const call = (posts.searchPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.pageSize).toBe(10);
    });

    it("maps results to public DTOs and preserves total/query", async () => {
      (posts.searchPublished as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [makePost({ slug: "s1" })],
        total: 1,
      });
      const result = await useCases.searchPublicPosts({ query: "hello" });
      if (result.kind !== "results") throw new Error("expected results");
      expect(result.query).toBe("hello");
      expect(result.total).toBe(1);
      expect(result.items[0]).not.toHaveProperty("id");
      expect(result.items[0].slug).toBe("s1");
    });
  });

  describe("listPopularPosts", () => {
    it("queries a 30-day window based on the injected now", async () => {
      const now = new Date("2026-02-01T00:00:00.000Z");
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await useCases.listPopularPosts({ now });
      const call = (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.since.toISOString()).toBe("2026-01-02T00:00:00.000Z");
      // 封閉時間區間上界：排除未來時間的瀏覽事件
      expect(call.until.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    });

    it("uses the injected now as the latest fallback visibility snapshot", async () => {
      const now = new Date("2026-02-01T00:00:00.000Z");
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await useCases.listPopularPosts({ now });

      expect(posts.listLatestPublished).toHaveBeenCalledWith({
        take: expect.any(Number),
        asOf: now,
      });
    });

    it("returns popular posts without calling the latest fallback when 5 are found", async () => {
      const popular = Array.from({ length: 5 }, (_, i) => makePost({ id: `p${i}`, slug: `p${i}` }));
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue(popular);
      const result = await useCases.listPopularPosts();
      expect(result).toHaveLength(5);
      expect(posts.listLatestPublished).not.toHaveBeenCalled();
    });

    it("fills remaining slots with latest posts deduped by id", async () => {
      const popular = [makePost({ id: "p1", slug: "p1" })];
      const latest = [
        makePost({ id: "p1", slug: "p1" }), // duplicate must be skipped
        makePost({ id: "p2", slug: "p2" }),
        makePost({ id: "p3", slug: "p3" }),
        makePost({ id: "p4", slug: "p4" }),
        makePost({ id: "p5", slug: "p5" }),
      ];
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue(popular);
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue(latest);
      const result = await useCases.listPopularPosts();
      expect(result.map((r) => r.slug)).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    });

    it("returns pure latest posts when there are zero popular views", async () => {
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const latest = Array.from({ length: 5 }, (_, i) => makePost({ id: `l${i}`, slug: `l${i}` }));
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue(latest);
      const result = await useCases.listPopularPosts();
      expect(result.map((r) => r.slug)).toEqual(["l0", "l1", "l2", "l3", "l4"]);
    });

    it("returns fewer than 5 when total public posts are insufficient", async () => {
      const popular = [makePost({ id: "p1", slug: "p1" })];
      const latest = [makePost({ id: "p1", slug: "p1" }), makePost({ id: "p2", slug: "p2" })];
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue(popular);
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue(latest);
      const result = await useCases.listPopularPosts();
      expect(result).toHaveLength(2);
    });

    it("stops filling as soon as the popular list reaches 5, ignoring extra latest posts", async () => {
      const popular = Array.from({ length: 4 }, (_, i) => makePost({ id: `p${i}`, slug: `p${i}` }));
      const latest = [
        makePost({ id: "l1", slug: "l1" }),
        makePost({ id: "l2", slug: "l2" }),
        makePost({ id: "l3", slug: "l3" }),
      ];
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue(popular);
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue(latest);
      const result = await useCases.listPopularPosts();
      expect(result).toHaveLength(5);
      expect(result.map((r) => r.slug)).toEqual(["p0", "p1", "p2", "p3", "l1"]);
    });

    it("requests a buffer larger than 5 from the latest port to survive dedup", async () => {
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await useCases.listPopularPosts();
      const call = (posts.listLatestPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.take).toBeGreaterThanOrEqual(10);
    });

    it("never exposes the internal id field on results", async () => {
      const popular = [makePost({ id: "p1", slug: "p1" })];
      (analytics.listPopularPublishedSince as ReturnType<typeof vi.fn>).mockResolvedValue(popular);
      const result = await useCases.listPopularPosts();
      expect(result[0]).not.toHaveProperty("id");
    });
  });

  describe("listLatestPosts", () => {
    it("requests at most 5 latest published posts", async () => {
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await useCases.listLatestPosts();
      const call = (posts.listLatestPublished as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.take).toBe(5);
      expect(call.asOf).toBeInstanceOf(Date);
    });

    it("maps to public DTOs preserving repository order", async () => {
      const latest = [makePost({ id: "l1", slug: "l1" }), makePost({ id: "l2", slug: "l2" })];
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue(latest);
      const result = await useCases.listLatestPosts();
      expect(result.map((r) => r.slug)).toEqual(["l1", "l2"]);
    });

    it("returns an empty array when there are zero public posts", async () => {
      (posts.listLatestPublished as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const result = await useCases.listLatestPosts();
      expect(result).toEqual([]);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache: (fn: (...args: unknown[]) => unknown) => {
      const store = new Map<string, unknown>();
      return (...args: unknown[]) => {
        const key = args.length ? JSON.stringify(args) : "__no-args__";
        if (store.has(key)) return store.get(key);
        const result = fn(...args);
        store.set(key, result);
        return result;
      };
    },
  };
});

const mockDiscoveryUseCases = {
  searchPublicPosts: vi.fn(),
  listPopularPosts: vi.fn(),
  listLatestPosts: vi.fn(),
};

vi.mock("@/modules/discovery", () => ({
  discoveryUseCases: mockDiscoveryUseCases,
}));

const publicSummary = Object.freeze({
  slug: "hello-world",
  title: "Hello World",
  excerpt: "excerpt",
  coverImage: null,
  publishedAt: "2026-01-01T00:00:00.000Z",
  category: null,
});

describe("discoveryQueries", () => {
  beforeEach(() => {
    vi.resetModules();
    mockDiscoveryUseCases.searchPublicPosts.mockReset();
    mockDiscoveryUseCases.listPopularPosts.mockReset();
    mockDiscoveryUseCases.listLatestPosts.mockReset();
  });

  describe("searchPublicPosts", () => {
    it("returns only public DTO fields for a successful search", async () => {
      mockDiscoveryUseCases.searchPublicPosts.mockResolvedValue({
        kind: "results",
        query: "hello",
        page: 1,
        pageSize: 10,
        total: 1,
        items: [publicSummary],
      });
      const { discoveryQueries } = await import("@/lib/server-queries");

      const result = await discoveryQueries.searchPublicPosts({ query: "hello" });

      if (result.kind !== "results") throw new Error("expected results");
      expect(result.items).toHaveLength(1);
      expect(Object.keys(result.items[0]).sort()).toEqual(
        ["category", "coverImage", "excerpt", "publishedAt", "slug", "title"].sort()
      );
      expect(result.items[0]).not.toHaveProperty("id");
    });

    it("returns a generalized error result instead of throwing when the use case fails", async () => {
      mockDiscoveryUseCases.searchPublicPosts.mockRejectedValue(new Error("db unavailable"));
      const { discoveryQueries } = await import("@/lib/server-queries");

      const result = await discoveryQueries.searchPublicPosts({ query: "hello" });

      expect(result).toEqual({ kind: "error", query: "hello" });
    });

    it("deduplicates identical search params within a request", async () => {
      mockDiscoveryUseCases.searchPublicPosts.mockResolvedValue({
        kind: "results",
        query: "hello",
        page: 1,
        pageSize: 10,
        total: 0,
        items: [],
      });
      const { discoveryQueries } = await import("@/lib/server-queries");

      await discoveryQueries.searchPublicPosts({ query: "hello", page: 1 });
      await discoveryQueries.searchPublicPosts({ page: 1, query: "hello" });

      expect(mockDiscoveryUseCases.searchPublicPosts).toHaveBeenCalledTimes(1);
    });
  });

  describe("listPopularPosts", () => {
    it("wraps a successful result as ok: true with public DTOs only", async () => {
      mockDiscoveryUseCases.listPopularPosts.mockResolvedValue([publicSummary]);
      const { discoveryQueries } = await import("@/lib/server-queries");

      const result = await discoveryQueries.listPopularPosts();

      expect(result.ok).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).not.toHaveProperty("id");
    });

    it("returns a generalized fallback instead of throwing when the use case fails", async () => {
      mockDiscoveryUseCases.listPopularPosts.mockRejectedValue(new Error("db unavailable"));
      const { discoveryQueries } = await import("@/lib/server-queries");

      const result = await discoveryQueries.listPopularPosts();

      expect(result).toEqual({ ok: false, items: [] });
    });
  });

  describe("listLatestPosts", () => {
    it("wraps a successful result as ok: true with public DTOs only", async () => {
      mockDiscoveryUseCases.listLatestPosts.mockResolvedValue([publicSummary]);
      const { discoveryQueries } = await import("@/lib/server-queries");

      const result = await discoveryQueries.listLatestPosts();

      expect(result.ok).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).not.toHaveProperty("id");
    });

    it("returns a generalized fallback instead of throwing when the use case fails", async () => {
      mockDiscoveryUseCases.listLatestPosts.mockRejectedValue(new Error("db unavailable"));
      const { discoveryQueries } = await import("@/lib/server-queries");

      const result = await discoveryQueries.listLatestPosts();

      expect(result).toEqual({ ok: false, items: [] });
    });
  });
});

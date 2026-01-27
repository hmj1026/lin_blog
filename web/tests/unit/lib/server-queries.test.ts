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

const mockPostsUseCases = {
  listPublishedPosts: vi.fn(),
};

const mockSiteSettingsUseCases = {
  getDefault: vi.fn(),
};

vi.mock("@/modules/posts", () => ({
  postsUseCases: mockPostsUseCases,
}));

vi.mock("@/modules/site-settings", () => ({
  siteSettingsUseCases: mockSiteSettingsUseCases,
}));

describe("server-queries", () => {
  beforeEach(() => {
    vi.resetModules();
    mockPostsUseCases.listPublishedPosts.mockReset();
    mockSiteSettingsUseCases.getDefault.mockReset();
  });

  it("deduplicates same parameters within a request", async () => {
    mockPostsUseCases.listPublishedPosts.mockResolvedValue([]);
    const { postsQueries } = await import("@/lib/server-queries");

    await postsQueries.listPublishedPosts({ tag: "design", take: 6 });
    await postsQueries.listPublishedPosts({ take: 6, tag: "design" });

    expect(mockPostsUseCases.listPublishedPosts).toHaveBeenCalledTimes(1);
  });

  it("does not reuse cache for different parameters", async () => {
    mockPostsUseCases.listPublishedPosts.mockResolvedValue([]);
    const { postsQueries } = await import("@/lib/server-queries");

    await postsQueries.listPublishedPosts({ tag: "design" });
    await postsQueries.listPublishedPosts({ tag: "strategy" });

    expect(mockPostsUseCases.listPublishedPosts).toHaveBeenCalledTimes(2);
  });

  it("deduplicates site settings reads", async () => {
    mockSiteSettingsUseCases.getDefault.mockResolvedValue({ siteName: "Lin Blog" });
    const { siteSettingsQueries } = await import("@/lib/server-queries");

    await siteSettingsQueries.getDefault();
    await siteSettingsQueries.getDefault();

    expect(mockSiteSettingsUseCases.getDefault).toHaveBeenCalledTimes(1);
  });
});

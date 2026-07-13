import { describe, it, expect, vi, beforeEach } from "vitest";
import { postsQueries } from "@/lib/server-queries";
import { logger } from "@/lib/logger";
import sitemap, { dynamic } from "@/app/sitemap";

// fix-recaptcha-render-race-and-sitemap：sitemap 必須於請求時產生（force-dynamic），
// 收錄查詢回傳的已發佈文章，DB 失敗時安全回退並記錄穩定事件碼（不洩漏原始錯誤）。
vi.mock("@/lib/server-queries", () => ({
  postsQueries: { listPublishedForSitemap: vi.fn() },
}));

vi.mock("@/env.public", () => ({
  publicEnv: {
    NEXT_PUBLIC_SITE_URL: "https://linstar.win",
    NEXT_PUBLIC_APP_ENV: "production",
    NODE_ENV: "production",
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const listMock = postsQueries.listPublishedForSitemap as unknown as ReturnType<typeof vi.fn>;
const errorMock = logger.error as unknown as ReturnType<typeof vi.fn>;

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("declares the force-dynamic rendering mode so build never bakes the content (task 2.2)", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("lists published posts with lastModified alongside the base pages (task 2.1)", async () => {
    listMock.mockResolvedValue([
      {
        slug: "hello",
        publishedAt: new Date("2026-01-02T00:00:00Z"),
        updatedAt: new Date("2026-01-03T00:00:00Z"),
      },
      { slug: "world", publishedAt: null, updatedAt: new Date("2026-02-05T00:00:00Z") },
    ]);

    const result = await sitemap();
    const urls = result.map((entry) => entry.url);
    expect(urls).toContain("https://linstar.win/");
    expect(urls).toContain("https://linstar.win/blog");
    expect(urls).toContain("https://linstar.win/blog/hello");
    expect(urls).toContain("https://linstar.win/blog/world");

    // publishedAt 優先，缺少時回退 updatedAt。
    const hello = result.find((entry) => entry.url.endsWith("/blog/hello"));
    expect(hello?.lastModified).toBe(new Date("2026-01-02T00:00:00Z").toISOString());
    const world = result.find((entry) => entry.url.endsWith("/blog/world"));
    expect(world?.lastModified).toBe(new Date("2026-02-05T00:00:00Z").toISOString());
  });

  it("includes only the posts the filtered query returns, not any extra URL (task 2.1)", async () => {
    // draft/已刪除/未到 publishTime 的過濾由 repository 的 listPublishedForSitemap 負責；
    // sitemap 只忠實映射查詢結果，不得自行新增其他文章 URL。
    listMock.mockResolvedValue([
      {
        slug: "only-published",
        publishedAt: new Date("2026-03-01T00:00:00Z"),
        updatedAt: new Date("2026-03-01T00:00:00Z"),
      },
    ]);

    const result = await sitemap();
    const blogPostUrls = result
      .map((entry) => entry.url)
      .filter((url) => url.includes("/blog/"));
    expect(blogPostUrls).toEqual(["https://linstar.win/blog/only-published"]);
  });

  it("falls back to base pages and logs a stable event code without leaking raw error on DB failure (task 2.1)", async () => {
    listMock.mockRejectedValue(new Error("connect ECONNREFUSED secret-dsn@db:5432"));

    const result = await sitemap();
    expect(result.map((entry) => entry.url)).toEqual([
      "https://linstar.win/",
      "https://linstar.win/blog",
    ]);
    expect(errorMock).toHaveBeenCalledWith(
      "sitemap.generate.error",
      expect.objectContaining({ code: "POST_QUERY_FAILED" })
    );

    // 不得輸出 raw error / stack / DSN / secret。
    const logged = JSON.stringify(errorMock.mock.calls);
    expect(logged).not.toContain("ECONNREFUSED");
    expect(logged).not.toContain("secret-dsn");
  });

  it("uses the configured canonical host and never emits an example.com placeholder (task 2.2)", async () => {
    listMock.mockResolvedValue([
      {
        slug: "p",
        publishedAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);

    const result = await sitemap();
    for (const entry of result) {
      expect(entry.url.startsWith("https://linstar.win")).toBe(true);
      expect(entry.url).not.toContain("example.com");
    }
  });
});

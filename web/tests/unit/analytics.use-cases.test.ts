import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAnalyticsUseCases } from "@/modules/analytics/application/use-cases";
import type { DeviceType } from "@/modules/analytics/domain";

describe("analytics use cases", () => {
  const analytics = {
    getPostSummary: vi.fn(),
    listPostAnalyticsSummaries: vi.fn(),
    listRefererCounts: vi.fn(),
    countViewEventsSince: vi.fn(),
    findRecentViewEvent: vi.fn(),
    createViewEvent: vi.fn(),
    getDashboardStats: vi.fn(),
    listPostViewEvents: vi.fn(),
  };

  const useCases = createAnalyticsUseCases({ analytics });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPostViewEvents", () => {
    it("caps pageSize to 100 and normalizes inputs", async () => {
      analytics.listPostViewEvents.mockResolvedValue({ total: 0, events: [] });

      await useCases.listPostViewEvents({
        postId: "p1",
        page: 0,
        pageSize: 999,
        deviceType: "MOBILE" satisfies DeviceType,
        ipMode: "equals",
        ip: " 1.2.3.4 ",
        userAgent: "  Chrome ",
        referer: " google ",
      });

      const call = analytics.listPostViewEvents.mock.calls[0]?.[0];
      expect(call.page).toBe(1);
      expect(call.pageSize).toBe(100);
      expect(call.filter.postId).toBe("p1");
      expect(call.filter.deviceType).toBe("MOBILE");
      expect(call.filter.ip).toEqual({ mode: "equals", value: "1.2.3.4" });
      expect(call.filter.userAgentContains).toBe("Chrome");
      expect(call.filter.refererContains).toBe("google");
    });
  });

  describe("listPostAnalyticsSummary", () => {
    it("returns complete database aggregates above the former 5,000-event cap", async () => {
      analytics.listPostAnalyticsSummaries.mockResolvedValue([
        {
          postId: "p1",
          slug: "s1",
          title: "T1",
          views: 6001,
          uniqueCount: 5100,
          previousViews: 3000,
          previousUniqueCount: 2800,
          lastViewedAt: new Date("2026-07-18T12:00:00Z"),
        },
      ]);
      analytics.listRefererCounts.mockResolvedValue([]);

      const result = await useCases.listPostAnalyticsSummary({ days: 7 });

      expect(result[0]).toEqual(expect.objectContaining({ views: 6001, uniqueCount: 5100, previousViews: 3000 }));
      expect(analytics.listPostAnalyticsSummaries).toHaveBeenCalledWith(expect.objectContaining({
        since: expect.any(Date),
        until: expect.any(Date),
        previousSince: expect.any(Date),
        previousUntil: expect.any(Date),
      }));
    });

    it("將分類、標籤與發布期間交給 repository，來源只查同批文章", async () => {
      analytics.listPostAnalyticsSummaries.mockResolvedValue([{ postId: "p1", slug: "s", title: "T", views: 2, uniqueCount: 2, previousViews: 1, previousUniqueCount: 1, lastViewedAt: null }]);
      analytics.listRefererCounts.mockResolvedValue([]);

      await useCases.listPostAnalyticsSummary({ days: 30, categoryId: "cat-1", tagId: "tag-1", publishedFrom: new Date("2026-01-01"), publishedTo: new Date("2026-07-01") });

      expect(analytics.listPostAnalyticsSummaries).toHaveBeenCalledWith(expect.objectContaining({ categoryId: "cat-1", tagId: "tag-1", publishedFrom: expect.any(Date), publishedTo: expect.any(Date) }));
      expect(analytics.listRefererCounts).toHaveBeenCalledWith(expect.objectContaining({ postIds: ["p1"] }));
    });
  });

  describe("countViews", () => {
    it("clamps days to 1-90 range", async () => {
      analytics.countViewEventsSince.mockResolvedValue(100);
      await useCases.countViews({ days: 200 });
      const call = analytics.countViewEventsSince.mock.calls[0]?.[0];
      expect(call.since).toBeInstanceOf(Date);
      // 90 days max
      const diff = (Date.now() - call.since.getTime()) / (24 * 60 * 60 * 1000);
      expect(diff).toBeLessThanOrEqual(91);
    });

    it("returns count from repo", async () => {
      analytics.countViewEventsSince.mockResolvedValue(42);
      const result = await useCases.countViews({ days: 7 });
      expect(result).toBe(42);
    });
  });

  describe("recordPostView", () => {
    const validPost = {
      id: "p1",
      slug: "test",
      deletedAt: null,
      status: "PUBLISHED" as const,
    };

    it("ignores preview source", async () => {
      const result = await useCases.recordPostView({
        post: validPost,
        source: "preview",
        ip: "1.2.3.4",
        userAgent: "Chrome",
      });
      expect(result).toEqual({ ignored: true });
      expect(analytics.createViewEvent).not.toHaveBeenCalled();
    });

    it("ignores deleted posts", async () => {
      const result = await useCases.recordPostView({
        post: { ...validPost, deletedAt: new Date() },
        ip: "1.2.3.4",
        userAgent: "Chrome",
      });
      expect(result).toEqual({ ignored: true });
    });

    it("ignores draft posts", async () => {
      const result = await useCases.recordPostView({
        post: { ...validPost, status: "DRAFT" },
        ip: "1.2.3.4",
        userAgent: "Chrome",
      });
      expect(result).toEqual({ ignored: true });
    });

    it("ignores bot user agents", async () => {
      const result = await useCases.recordPostView({
        post: validPost,
        ip: "1.2.3.4",
        userAgent: "Googlebot/2.1",
      });
      expect(result).toEqual({ ignored: true });
    });

    it("ignores recent fingerprint (within 30min)", async () => {
      analytics.findRecentViewEvent.mockResolvedValue({ id: "existing" });
      const result = await useCases.recordPostView({
        post: validPost,
        ip: "1.2.3.4",
        userAgent: "Chrome/100",
      });
      expect(result).toEqual({ ignored: true });
      expect(analytics.createViewEvent).not.toHaveBeenCalled();
    });

    it("creates view event for valid request", async () => {
      analytics.findRecentViewEvent.mockResolvedValue(null);
      analytics.createViewEvent.mockResolvedValue({ id: "new-event" });
      const result = await useCases.recordPostView({
        post: validPost,
        ip: "1.2.3.4",
        userAgent: "Mozilla/5.0 Chrome/100",
        referer: "https://google.com",
        acceptLanguage: "zh-TW",
      });
      expect(result.ok).toBe(true);
      expect(analytics.createViewEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          postId: "p1",
          slug: "test",
          ip: "1.2.3.4",
          fingerprint: expect.any(String),
        })
      );
    });
  });

  describe("getDashboardStats", () => {
    it("parses user agents into browser/os stats", async () => {
      analytics.getDashboardStats.mockResolvedValue({
        trend: [{ date: "2026-07-17", count: 3 }],
        topPosts: [],
        devices: [],
        referers: [],
        totalViews: 3,
        previousTotalViews: 2,
        userAgents: [
          // 完整的 Chrome on Windows UA
          { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", count: 10 },
          // 完整的 Safari on macOS UA
          { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15", count: 5 },
          // 完整的 Chrome on Android UA
          { userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36", count: 3 },
        ],
      });
      const fixedUseCases = createAnalyticsUseCases({
        analytics,
        now: () => new Date("2026-07-18T12:00:00.000Z"),
      });
      const result = await fixedUseCases.getDashboardStats({ days: 7 });
      expect(result.trend).toHaveLength(7);
      expect(result.trend).toContainEqual({ date: "2026-07-17", count: 3 });
      expect(result.trend).toContainEqual({ date: "2026-07-12", count: 0 });
      expect(result.comparison).toEqual({ current: 3, previous: 2, percentChange: 50 });
      expect(result.browsers).toContainEqual(expect.objectContaining({ name: "Chrome" }));
      expect(result.browsers).toContainEqual(expect.objectContaining({ name: "Safari" }));
      expect(result.os).toContainEqual(expect.objectContaining({ name: "Windows" }));
      expect(result.os).toContainEqual(expect.objectContaining({ name: "macOS" }));
    });
  });

  describe("getPostSummary", () => {
    it("delegates to repo", async () => {
      analytics.getPostSummary.mockResolvedValue({ views: 100, uniques: 50 });
      const result = await useCases.getPostSummary("p1");
      expect(analytics.getPostSummary).toHaveBeenCalledWith("p1");
      expect(result).toEqual({ views: 100, uniques: 50 });
    });
  });
});

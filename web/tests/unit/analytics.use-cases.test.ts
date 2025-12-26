import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAnalyticsUseCases } from "@/modules/analytics/application/use-cases";
import type { DeviceType } from "@/modules/analytics/domain";

describe("analytics use cases", () => {
  const analytics = {
    getPostSummary: vi.fn(),
    listEventsSince: vi.fn(),
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
    it("calls repo with since and max take", async () => {
      analytics.listEventsSince.mockResolvedValue([]);
      await useCases.listPostAnalyticsSummary({ days: 999 });
      const call = analytics.listEventsSince.mock.calls[0]?.[0];
      expect(call.take).toBe(5000);
      expect(call.since).toBeInstanceOf(Date);
    });

    it("aggregates events by postId", async () => {
      analytics.listEventsSince.mockResolvedValue([
        { postId: "p1", fingerprint: "fp1", viewedAt: new Date(), post: { slug: "s1", title: "T1", deletedAt: null } },
        { postId: "p1", fingerprint: "fp2", viewedAt: new Date(), post: { slug: "s1", title: "T1", deletedAt: null } },
        { postId: "p2", fingerprint: "fp3", viewedAt: new Date(), post: { slug: "s2", title: "T2", deletedAt: null } },
      ]);
      const result = await useCases.listPostAnalyticsSummary({ days: 7 });
      expect(result).toHaveLength(2);
      const p1 = result.find((r) => r.postId === "p1");
      expect(p1?.views).toBe(2);
      expect(p1?.uniqueCount).toBe(2);
    });

    it("excludes deleted posts", async () => {
      analytics.listEventsSince.mockResolvedValue([
        { postId: "p1", fingerprint: "fp1", viewedAt: new Date(), post: { slug: "s1", title: "T1", deletedAt: new Date() } },
      ]);
      const result = await useCases.listPostAnalyticsSummary({ days: 7 });
      expect(result).toHaveLength(0);
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
        trend: [],
        topPosts: [],
        devices: [],
        userAgents: [
          { userAgent: "Mozilla/5.0 (Windows NT 10.0) AppleWebKit Chrome/100", count: 10 },
          { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605", count: 5 },
          { userAgent: "Mozilla/5.0 (Linux; Android) Chrome/100", count: 3 },
        ],
      });
      const result = await useCases.getDashboardStats({ days: 7 });
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

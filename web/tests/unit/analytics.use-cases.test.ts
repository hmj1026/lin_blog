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

  it("listPostViewEvents() caps pageSize to 100 and normalizes inputs", async () => {
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

  it("listPostAnalyticsSummary() calls repo with since and max take", async () => {
    analytics.listEventsSince.mockResolvedValue([]);
    await useCases.listPostAnalyticsSummary({ days: 999 });
    const call = analytics.listEventsSince.mock.calls[0]?.[0];
    expect(call.take).toBe(5000);
    expect(call.since).toBeInstanceOf(Date);
  });
});

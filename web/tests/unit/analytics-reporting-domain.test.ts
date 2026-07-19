import { describe, expect, it } from "vitest";

import {
  buildAnalyticsDateRange,
  classifyTrafficSource,
  fillDailyTrend,
  maskIpAddress,
} from "@/modules/analytics/domain/reporting";

describe("analytics reporting domain", () => {
  it("builds exact Asia/Taipei calendar ranges across UTC midnight", () => {
    const range = buildAnalyticsDateRange({
      days: 7,
      now: new Date("2026-07-18T16:30:00.000Z"),
    });

    expect(range.since).toEqual(new Date("2026-07-12T16:00:00.000Z"));
    expect(range.until).toEqual(new Date("2026-07-19T16:00:00.000Z"));
    expect(range.previousSince).toEqual(new Date("2026-07-05T16:00:00.000Z"));
    expect(range.previousUntil).toEqual(range.since);
    expect(range.dateKeys).toEqual([
      "2026-07-13",
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
    ]);
  });

  it("clamps the reporting period to 1–90 days", () => {
    expect(buildAnalyticsDateRange({ days: 999, now: new Date("2026-07-18T00:00:00Z") }).days).toBe(90);
    expect(buildAnalyticsDateRange({ days: 0, now: new Date("2026-07-18T00:00:00Z") }).days).toBe(1);
  });

  it("fills zero-view dates without changing the requested sequence", () => {
    expect(fillDailyTrend(["2026-07-17", "2026-07-18", "2026-07-19"], [
      { date: "2026-07-18", count: 4 },
    ])).toEqual([
      { date: "2026-07-17", count: 0 },
      { date: "2026-07-18", count: 4 },
      { date: "2026-07-19", count: 0 },
    ]);
  });

  it.each([
    [null, "DIRECT_UNKNOWN"],
    ["", "DIRECT_UNKNOWN"],
    ["/blog/post", "INTERNAL"],
    ["https://blog.example.com/post", "INTERNAL"],
    ["https://www.google.com/search?q=blog", "ORGANIC_SEARCH"],
    ["https://www.google.co.jp/search", "ORGANIC_SEARCH"],
    ["https://www.facebook.com/post", "SOCIAL"],
    ["https://news.example.net/story", "REFERRAL"],
    // 網域邊界：部分字串命中不得誤判為自然搜尋。
    ["https://notgoogle.com/x", "REFERRAL"],
    ["https://google.evil.example/x", "REFERRAL"],
  ] as const)("classifies %s as %s", (referer, expected) => {
    expect(classifyTrafficSource(referer, { internalHosts: ["blog.example.com"] })).toBe(expected);
  });

  it("masks IPv4 and IPv6 identifiers by default", () => {
    expect(maskIpAddress("192.168.12.34")).toBe("192.168.12.xxx");
    expect(maskIpAddress("2001:db8:abcd:0012::1")).toBe("2001:db8:abcd:xxxx");
  });
});

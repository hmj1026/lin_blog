import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { DeviceType } from "@/modules/analytics/domain";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    post: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    postViewEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

// Mock mappers
vi.mock("@/modules/analytics/infrastructure/prisma/mappers", () => ({
  mapDeviceTypeToPrisma: (t: any) => t,
  mapDeviceTypeFromPrisma: (t: any) => t,
}));

// Import after mock
import { analyticsRepositoryPrisma } from "@/modules/analytics/infrastructure/prisma/analytics.repository.prisma";

describe("analyticsRepositoryPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPost = {
    id: "post-1",
    slug: "post-1-slug",
    title: "Post 1",
    deletedAt: null,
  };

  const mockEvent = {
    id: "evt-1",
    postId: "post-1",
    slug: "post-1-slug",
    ip: "127.0.0.1",
    deviceType: "DESKTOP" as DeviceType,
    viewedAt: new Date(),
  };

  describe("getPostSummary", () => {
    it("returns post summary", async () => {
      (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPost);
      const result = await analyticsRepositoryPrisma.getPostSummary("post-1");
      expect(result).toEqual(mockPost);
    });
  });

  describe("listPostAnalyticsSummaries", () => {
    it("maps complete database aggregates without an event cap", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          postId: "post-1",
          slug: "post-1-slug",
          title: "Post 1",
          views: BigInt(6001),
          uniqueCount: BigInt(5100),
          previousViews: BigInt(3000),
          previousUniqueCount: BigInt(2800),
          lastViewedAt: new Date("2026-07-18T10:00:00Z"),
        },
      ]);

      const result = await analyticsRepositoryPrisma.listPostAnalyticsSummaries({
        since: new Date("2026-07-12T16:00:00Z"),
        until: new Date("2026-07-19T16:00:00Z"),
        previousSince: new Date("2026-07-05T16:00:00Z"),
        previousUntil: new Date("2026-07-12T16:00:00Z"),
      });

      expect(result[0]).toEqual(expect.objectContaining({ views: 6001, uniqueCount: 5100 }));
    });

    it("以文章關聯先收斂分類、標籤與發布期間", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "post-1" }]);
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await analyticsRepositoryPrisma.listPostAnalyticsSummaries({
        since: new Date("2026-07-01"), until: new Date("2026-08-01"), previousSince: new Date("2026-06-01"), previousUntil: new Date("2026-07-01"),
        categoryId: "cat-1", tagId: "tag-1", publishedFrom: new Date("2026-01-01"), publishedTo: new Date("2026-07-01"),
      });

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ categories: { some: { id: "cat-1" } }, tags: { some: { id: "tag-1" } }, publishedAt: { gte: expect.any(Date), lte: expect.any(Date) } }),
        select: { id: true },
      });
    });
  });

  describe("createViewEvent", () => {
    it("creates event", async () => {
      (prisma.postViewEvent.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "evt-1" });
      const result = await analyticsRepositoryPrisma.createViewEvent({
        postId: "post-1",
        slug: "slug",
        ip: "ip",
        userAgent: "ua",
        deviceType: "DESKTOP",
        fingerprint: "fp",
      });
      expect(result.id).toBe("evt-1");
    });
  });

  describe("getDashboardStats", () => {
    it("returns dashboard stats", async () => {
      (prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
        { date: "2023-01-01", count: BigInt(10) },
      ]);
      (prisma.postViewEvent.groupBy as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([
          { postId: "post-1", slug: "slug", _count: { id: 5 } },
        ]) // topPosts
        .mockResolvedValueOnce([{ deviceType: "DESKTOP", _count: { id: 10 } }]) // deviceStats
        .mockResolvedValueOnce([{ userAgent: "Chrome", _count: { id: 10 } }]) // uaStats
        .mockResolvedValueOnce([{ referer: "https://google.com", _count: { id: 10 } }]); // referers
      (prisma.postViewEvent.count as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(4);

      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockPost]);

      const result = await analyticsRepositoryPrisma.getDashboardStats({
        since: new Date("2026-07-12T16:00:00Z"),
        until: new Date("2026-07-19T16:00:00Z"),
        previousSince: new Date("2026-07-05T16:00:00Z"),
        previousUntil: new Date("2026-07-12T16:00:00Z"),
        takeTopPosts: 5,
      });

      expect(result.trend).toHaveLength(1);
      expect(result.trend[0].count).toBe(10);
      expect(result.topPosts).toHaveLength(1);
      expect(result.devices).toHaveLength(1);
      expect(result.userAgents).toHaveLength(1);
      expect(result.referers).toEqual([{ referer: "https://google.com", count: 10 }]);
      expect(result.totalViews).toBe(10);
      expect(result.previousTotalViews).toBe(4);

      // 迴歸防護：UTC timestamp 必須先標記 UTC 再轉台北，直接 AT TIME ZONE 'Asia/Taipei' 會往反方向平移 8 小時。
      const trendSql = ((prisma.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0][0] as readonly string[]).join("?");
      expect(trendSql).toContain(`DATE(("viewedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Taipei')`);
      expect(trendSql).not.toMatch(/DATE\("viewedAt" AT TIME ZONE 'Asia\/Taipei'\)/);
    });
  });
});

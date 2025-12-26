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

  describe("listEventsSince", () => {
    it("returns events", async () => {
      (prisma.postViewEvent.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockEvent]);
      const result = await analyticsRepositoryPrisma.listEventsSince({ since: new Date(), take: 10 });
      expect(result).toHaveLength(1);
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
        .mockResolvedValueOnce([{ userAgent: "Chrome", _count: { id: 10 } }]); // uaStats

      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockPost]);

      const result = await analyticsRepositoryPrisma.getDashboardStats({
        since: new Date(),
        takeTopPosts: 5,
      });

      expect(result.trend).toHaveLength(1);
      expect(result.trend[0].count).toBe(10);
      expect(result.topPosts).toHaveLength(1);
      expect(result.devices).toHaveLength(1);
      expect(result.userAgents).toHaveLength(1);
    });
  });
});

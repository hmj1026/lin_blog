import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AnalyticsRepository } from "../../application/ports";
import { mapDeviceTypeFromPrisma, mapDeviceTypeToPrisma } from "./mappers";

export const analyticsRepositoryPrisma: AnalyticsRepository = {
  async getPostSummary(postId) {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, slug: true, title: true, deletedAt: true } });
    return post ?? null;
  },

  async listEventsSince(params) {
    return prisma.postViewEvent.findMany({
      where: { deletedAt: null, viewedAt: { gte: params.since } },
      include: { post: { select: { id: true, slug: true, title: true, deletedAt: true } } },
      orderBy: { viewedAt: "desc" },
      take: params.take,
    });
  },

  countViewEventsSince: (params) => prisma.postViewEvent.count({ where: { deletedAt: null, viewedAt: { gte: params.since } } }),

  async findRecentViewEvent(params) {
    const recent = await prisma.postViewEvent.findFirst({
      where: { postId: params.postId, fingerprint: params.fingerprint, viewedAt: { gte: params.since }, deletedAt: null },
      select: { id: true },
      orderBy: { viewedAt: "desc" },
    });
    return recent ?? null;
  },

  async createViewEvent(data) {
    return prisma.postViewEvent.create({
      data: {
        postId: data.postId,
        slug: data.slug,
        ip: data.ip,
        userAgent: data.userAgent,
        referer: data.referer ?? null,
        acceptLanguage: data.acceptLanguage ?? null,
        deviceType: mapDeviceTypeToPrisma(data.deviceType),
        fingerprint: data.fingerprint,
      },
      select: { id: true },
    });
  },

  async getDashboardStats(params) {
    const viewsByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("viewedAt") as date, COUNT(*) as count
      FROM "PostViewEvent"
      WHERE "deletedAt" IS NULL AND "viewedAt" >= ${params.since}
      GROUP BY DATE("viewedAt")
      ORDER BY date ASC
    `;

    const topPosts = await prisma.postViewEvent.groupBy({
      by: ["postId", "slug"],
      where: { deletedAt: null, viewedAt: { gte: params.since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: params.takeTopPosts,
    });

    const postIds = topPosts.map((p) => p.postId);
    const posts = await prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, title: true },
    });
    const postMap = new Map(posts.map((p) => [p.id, p.title]));

    const deviceStats = await prisma.postViewEvent.groupBy({
      by: ["deviceType"],
      where: { deletedAt: null, viewedAt: { gte: params.since } },
      _count: { id: true },
    });

    const uaStats = await prisma.postViewEvent.groupBy({
      by: ["userAgent"],
      where: { deletedAt: null, viewedAt: { gte: params.since } },
      _count: { id: true },
    });

    return {
      trend: viewsByDay.map((v) => ({ date: v.date, count: Number(v.count) })),
      topPosts: topPosts.map((p) => ({
        postId: p.postId,
        slug: p.slug,
        title: postMap.get(p.postId) || p.slug,
        count: p._count.id,
      })),
      devices: deviceStats.map((d) => ({ type: mapDeviceTypeFromPrisma(d.deviceType), count: d._count.id })),
      userAgents: uaStats.map((u) => ({ userAgent: u.userAgent, count: u._count.id })),
    };
  },

  async listPostViewEvents(params) {
    const where: Prisma.PostViewEventWhereInput = {
      deletedAt: null,
      postId: params.filter.postId,
      viewedAt: {
        gte: params.filter.since,
        lte: params.filter.until,
      },
      deviceType: params.filter.deviceType ? mapDeviceTypeToPrisma(params.filter.deviceType) : undefined,
      ip: params.filter.ip
        ? params.filter.ip.mode === "equals"
          ? params.filter.ip.value
          : { contains: params.filter.ip.value }
        : undefined,
      userAgent: params.filter.userAgentContains ? { contains: params.filter.userAgentContains } : undefined,
      referer: params.filter.refererContains ? { contains: params.filter.refererContains } : undefined,
    };

    const skip = (params.page - 1) * params.pageSize;
    const take = params.pageSize;

    const [total, events] = await Promise.all([
      prisma.postViewEvent.count({ where }),
      prisma.postViewEvent.findMany({
        where,
        orderBy: { viewedAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          postId: true,
          viewedAt: true,
          ip: true,
          userAgent: true,
          referer: true,
          acceptLanguage: true,
          deviceType: true,
          fingerprint: true,
        },
      }),
    ]);

    return { total, events: events.map((e) => ({ ...e, deviceType: mapDeviceTypeFromPrisma(e.deviceType) })) };
  },
};

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AnalyticsRepository } from "../../application/ports";
import { mapDeviceTypeFromPrisma, mapDeviceTypeToPrisma } from "./mappers";

export const analyticsRepositoryPrisma: AnalyticsRepository = {
  async getPostSummary(postId) {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true, slug: true, title: true, deletedAt: true } });
    return post ?? null;
  },

  async listPostAnalyticsSummaries(params) {
    const hasPostFilters = Boolean(params.categoryId || params.tagId || params.publishedFrom || params.publishedTo);
    let postFilter = Prisma.empty;
    if (hasPostFilters) {
      const posts = await prisma.post.findMany({
        where: {
          categories: params.categoryId ? { some: { id: params.categoryId } } : undefined,
          tags: params.tagId ? { some: { id: params.tagId } } : undefined,
          publishedAt: params.publishedFrom || params.publishedTo ? { gte: params.publishedFrom, lte: params.publishedTo } : undefined,
        },
        select: { id: true },
      });
      if (posts.length === 0) return [];
      postFilter = Prisma.sql`AND p."id" IN (${Prisma.join(posts.map((post) => post.id))})`;
    }
    const rows = await prisma.$queryRaw<Array<{
      postId: string;
      slug: string;
      title: string;
      views: bigint;
      uniqueCount: bigint;
      previousViews: bigint;
      previousUniqueCount: bigint;
      lastViewedAt: Date | null;
    }>>`
      SELECT
        p."id" AS "postId",
        p."slug" AS "slug",
        p."title" AS "title",
        COUNT(*) FILTER (
          WHERE e."viewedAt" >= ${params.since} AND e."viewedAt" < ${params.until}
        ) AS "views",
        COUNT(DISTINCT e."fingerprint") FILTER (
          WHERE e."viewedAt" >= ${params.since} AND e."viewedAt" < ${params.until}
        ) AS "uniqueCount",
        COUNT(*) FILTER (
          WHERE e."viewedAt" >= ${params.previousSince} AND e."viewedAt" < ${params.previousUntil}
        ) AS "previousViews",
        COUNT(DISTINCT e."fingerprint") FILTER (
          WHERE e."viewedAt" >= ${params.previousSince} AND e."viewedAt" < ${params.previousUntil}
        ) AS "previousUniqueCount",
        MAX(e."viewedAt") FILTER (
          WHERE e."viewedAt" >= ${params.since} AND e."viewedAt" < ${params.until}
        ) AS "lastViewedAt"
      FROM "PostViewEvent" e
      INNER JOIN "Post" p ON p."id" = e."postId"
      WHERE e."deletedAt" IS NULL
        AND p."deletedAt" IS NULL
        AND e."viewedAt" >= ${params.previousSince}
        AND e."viewedAt" < ${params.until}
        ${postFilter}
      GROUP BY p."id", p."slug", p."title"
      -- 不以「本期 count > 0」過濾：前期有流量、本期降為零的文章仍須納入衰退／比較報表。
      -- WHERE 已限定事件落在 [previousSince, until)，每個分組必有前期或本期事件，無需額外 HAVING。
      ORDER BY "views" DESC, "uniqueCount" DESC, p."id" ASC
    `;

    return rows.map((row) => ({
      ...row,
      views: Number(row.views),
      uniqueCount: Number(row.uniqueCount),
      previousViews: Number(row.previousViews),
      previousUniqueCount: Number(row.previousUniqueCount),
    }));
  },

  async listRefererCounts(params) {
    if (params.postIds?.length === 0) return [];
    const postFilter = params.postIds?.length
      ? Prisma.sql`AND "postId" IN (${Prisma.join(params.postIds)})`
      : Prisma.empty;
    if (params.groupByPost) {
      const rows = await prisma.$queryRaw<Array<{ postId: string; referer: string | null; count: bigint }>>`
        SELECT "postId", "referer", COUNT(*) AS "count"
        FROM "PostViewEvent"
        WHERE "deletedAt" IS NULL
          AND "viewedAt" >= ${params.since}
          AND "viewedAt" < ${params.until}
          ${postFilter}
        GROUP BY "postId", "referer"
      `;
      return rows.map((row) => ({ ...row, count: Number(row.count) }));
    }

    const rows = await prisma.postViewEvent.groupBy({
      by: ["referer"],
      where: { deletedAt: null, viewedAt: { gte: params.since, lt: params.until } },
      _count: { id: true },
    });
    return rows.map((row) => ({ postId: null, referer: row.referer, count: row._count.id }));
  },

  countViewEventsSince: (params) => prisma.postViewEvent.count({
    where: { deletedAt: null, viewedAt: { gte: params.since, lt: params.until } },
  }),

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
    // viewedAt 為無時區 timestamp（UTC 值）：先標記為 UTC 再轉台北，才能取得正確的台北日曆日。
    const viewsByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(("viewedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Taipei') as date, COUNT(*) as count
      FROM "PostViewEvent"
      WHERE "deletedAt" IS NULL
        AND "viewedAt" >= ${params.since}
        AND "viewedAt" < ${params.until}
      GROUP BY DATE(("viewedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Taipei')
      ORDER BY date ASC
    `;

    const topPosts = await prisma.postViewEvent.groupBy({
      by: ["postId", "slug"],
      where: { deletedAt: null, viewedAt: { gte: params.since, lt: params.until } },
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
      where: { deletedAt: null, viewedAt: { gte: params.since, lt: params.until } },
      _count: { id: true },
    });

    const uaStats = await prisma.postViewEvent.groupBy({
      by: ["userAgent"],
      where: { deletedAt: null, viewedAt: { gte: params.since, lt: params.until } },
      _count: { id: true },
    });

    const refererStats = await prisma.postViewEvent.groupBy({
      by: ["referer"],
      where: { deletedAt: null, viewedAt: { gte: params.since, lt: params.until } },
      _count: { id: true },
    });

    const [totalViews, previousTotalViews] = await Promise.all([
      prisma.postViewEvent.count({
        where: { deletedAt: null, viewedAt: { gte: params.since, lt: params.until } },
      }),
      prisma.postViewEvent.count({
        where: { deletedAt: null, viewedAt: { gte: params.previousSince, lt: params.previousUntil } },
      }),
    ]);

    return {
      trend: viewsByDay.map((v) => ({ date: normalizeSqlDate(v.date), count: Number(v.count) })),
      topPosts: topPosts.map((p) => ({
        postId: p.postId,
        slug: p.slug,
        title: postMap.get(p.postId) || p.slug,
        count: p._count.id,
      })),
      devices: deviceStats.map((d) => ({ type: mapDeviceTypeFromPrisma(d.deviceType), count: d._count.id })),
      userAgents: uaStats.map((u) => ({ userAgent: u.userAgent, count: u._count.id })),
      referers: refererStats.map((row) => ({ referer: row.referer, count: row._count.id })),
      totalViews,
      previousTotalViews,
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

/** 將 PostgreSQL DATE 結果正規化為報表使用的 YYYY-MM-DD key。 */
function normalizeSqlDate(value: string | Date): string {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

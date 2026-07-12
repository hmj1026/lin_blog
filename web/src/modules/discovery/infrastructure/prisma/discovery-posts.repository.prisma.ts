import { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publishTimeReached } from "@/lib/prisma/public-post-visibility";
import type { DiscoveryPostsPort } from "../../application/ports";
import { postSourceSelect, toPostSourceRecord } from "./mappers";

/**
 * `DiscoveryPostsPort` 的 Prisma 實作。
 *
 * 只查詢已發佈（`status = PUBLISHED`）、未刪除（`deletedAt = null`）且已到
 * 發佈時間（`publishedAt` 為 null 或 <= 現在）的文章，與既有
 * `postRepositoryPrisma` 的公開讀取條件一致。
 */
export const discoveryPostsRepositoryPrisma: DiscoveryPostsPort = {
  async searchPublished(params) {
    const where = {
      status: PostStatus.PUBLISHED,
      deletedAt: null,
      AND: [
        publishTimeReached(new Date()),
        {
          OR: [
            { title: { contains: params.query, mode: "insensitive" as const } },
            { excerpt: { contains: params.query, mode: "insensitive" as const } },
          ],
        },
      ],
    };

    const skip = (params.page - 1) * params.pageSize;

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: postSourceSelect,
        // publishedAt 允許 NULL（視為立即可見）；Postgres DESC 預設 NULLS FIRST，
        // 明確指定 NULLS LAST 讓無日期文章排在有日期文章之後
        orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
        skip,
        take: params.pageSize,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      items: rows.map(toPostSourceRecord),
      total,
    };
  },

  async listLatestPublished(params) {
    const rows = await prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED, deletedAt: null, ...publishTimeReached(params.asOf) },
      select: postSourceSelect,
      orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { id: "desc" }],
      take: params.take,
    });

    return rows.map(toPostSourceRecord);
  },
};

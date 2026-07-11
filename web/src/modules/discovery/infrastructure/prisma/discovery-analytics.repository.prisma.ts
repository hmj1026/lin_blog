import { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { publishTimeReached } from "@/lib/prisma/public-post-visibility";
import type { DiscoveryAnalyticsPort } from "../../application/ports";
import { postSourceSelect, toPostSourceRecord } from "./mappers";

/**
 * `DiscoveryAnalyticsPort` 的 Prisma 實作。
 *
 * 有效瀏覽事件定義與既有 `analyticsRepositoryPrisma`（`deletedAt: null`）
 * 一致。聚合、公開文章過濾、排序與截斷全部在資料庫層一次完成（raw SQL
 * join + GROUP BY + ORDER BY + LIMIT），符合 design D5「每個查詢都有有界
 * 筆數」：不論視窗內事件量或文章量成長，回傳列數恆為 `take` 上限，且
 * 草稿／已刪除／未到發佈時間文章的事件不會佔用排行名額。
 *
 * 時間視窗為封閉區間 `[since, until]`：上界排除時鐘偏移或匯入產生的
 * 未來事件，發佈時間界限（`publishedAt IS NULL OR publishedAt <= until`）
 * 與 `publishTimeReached` SSOT 的語意一致。
 */
export const discoveryAnalyticsRepositoryPrisma: DiscoveryAnalyticsPort = {
  async listPopularPublishedSince(params) {
    // 排序：viewCount DESC → publishedAt DESC（NULLS LAST 對應原本 null 視為
    // 最舊的語意）→ id DESC 決勝，與 use case 文件所述一致。
    const ranked = await prisma.$queryRaw<{ id: string }[]>`
      SELECT p."id"
      FROM "PostViewEvent" e
      JOIN "Post" p ON p."id" = e."postId"
      WHERE e."deletedAt" IS NULL
        AND e."viewedAt" >= ${params.since}
        AND e."viewedAt" <= ${params.until}
        AND p."status" = 'PUBLISHED'::"PostStatus"
        AND p."deletedAt" IS NULL
        AND (p."publishedAt" IS NULL OR p."publishedAt" <= ${params.until})
      GROUP BY p."id", p."publishedAt"
      ORDER BY COUNT(e."id") DESC, p."publishedAt" DESC NULLS LAST, p."id" DESC
      LIMIT ${params.take}
    `;

    if (ranked.length === 0) return [];

    const orderedIds = ranked.map((row) => row.id);
    // 縱深防禦：raw SQL 已過濾公開條件，此處仍重申可見性守則（與
    // discovery-posts 讀取路徑一致），避免兩查詢間狀態變更的窄窗漏出。
    const rows = await prisma.post.findMany({
      where: {
        id: { in: orderedIds },
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        ...publishTimeReached(params.until),
      },
      select: postSourceSelect,
    });

    // findMany 不保證回傳順序，依 ranked 的排序還原。
    const rowById = new Map(rows.map((row) => [row.id, row]));
    return orderedIds
      .map((id) => rowById.get(id))
      .filter((row): row is NonNullable<typeof row> => row !== undefined)
      .map(toPostSourceRecord);
  },
};

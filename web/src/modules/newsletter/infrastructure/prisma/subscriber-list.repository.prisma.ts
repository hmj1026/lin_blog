/**
 * `SubscriberListRepository` 的 Prisma 實作。
 *
 * `search` 同時比對姓名與 Email（不分大小寫、contains）；結果依
 * `createdAt DESC`、`id DESC` 排序作為穩定 tiebreak（與
 * `discoveryPostsRepositoryPrisma` 的 `[{ x: "desc" }, { id: "desc" }]`
 * 慣例一致）。只 select 名單所需的安全欄位，不回傳 `updatedAt` 等內部欄位。
 */
import { prisma } from "@/lib/db";
import type { SubscriberListItem, SubscriberListRepository, SubscriberListResult } from "../../application/ports";

const subscriberListItemSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

export const subscriberListRepositoryPrisma: SubscriberListRepository = {
  async list(params: { search?: string; page: number; pageSize: number }): Promise<SubscriberListResult> {
    // 已知限制（本期刻意不處理）：`contains` + `insensitive` 會編譯為
    // `ILIKE '%q%'`（前置萬用字元），無法使用 `Subscriber` 既有的 btree
    // 索引（email unique、createdAt），因此搜尋走 sequential scan。在本站
    // 預期的訂閱者量級（個人部落格、無匯出/群發功能、pageSize 上限 50、
    // 搜尋字串上限 200）下成本可忽略。當名單成長至數萬筆以上時，升級路徑
    // 為：新增 migration `CREATE EXTENSION IF NOT EXISTS pg_trgm;` 並對
    // `name` / `email` 建立 GIN trigram 索引（`gin_trgm_ops`）。
    const where = params.search
      ? {
          OR: [
            { name: { contains: params.search, mode: "insensitive" as const } },
            { email: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const skip = (params.page - 1) * params.pageSize;

    const [rows, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        select: subscriberListItemSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: params.pageSize,
      }),
      prisma.subscriber.count({ where }),
    ]);

    const items: SubscriberListItem[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      createdAt: row.createdAt,
    }));

    return { items, total };
  },
};

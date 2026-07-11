import type { PostSourceRecord } from "../../application/ports";

/**
 * Prisma 文章查詢結果的最小欄位形狀（`select` 對應）。
 */
export type PrismaPostSourceRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: Date | null;
  categories: { name: string; deletedAt: Date | null }[];
};

/**
 * 將 Prisma 查詢列映射為 discovery application 層的 `PostSourceRecord`。
 *
 * category 採與 `toFrontendPost`（`src/lib/frontend/post.ts`）一致的慣例：
 * 取第一個未刪除的分類名稱；沒有可用分類時回傳 `null`（discovery DTO
 * 允許 `category: string | null`，不像前台頁面需要「未分類」文案）。
 */
export function toPostSourceRecord(row: PrismaPostSourceRow): PostSourceRecord {
  const category = row.categories.find((c) => c.deletedAt === null)?.name ?? null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: row.coverImage,
    publishedAt: row.publishedAt,
    category,
  };
}

/**
 * 共用的 Prisma `select`：只取公開探索所需的最小欄位，刻意不含
 * `content`、`status`、`deletedAt` 等欄位，避免經由型別推斷不慎外洩。
 */
export const postSourceSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverImage: true,
  publishedAt: true,
  categories: {
    select: { name: true, deletedAt: true },
  },
} as const;

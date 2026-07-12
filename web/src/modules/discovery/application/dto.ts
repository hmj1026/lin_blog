import type { PostSourceRecord } from "./ports";

/**
 * 公開文章探索摘要 DTO。
 *
 * 只包含公開展示必要欄位，刻意不含 id、狀態、刪除時間、作者等後台/管理
 * 語意欄位，亦不含文章完整內容，避免探索模組洩漏非公開資料。
 */
export type PublicPostSummary = Readonly<{
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  publishedAt: string | null;
  category: string | null;
}>;

/**
 * 將內部文章來源紀錄映射為公開探索 DTO。
 *
 * 輸出物件會被凍結（`Object.freeze`），避免呼叫端意外修改共享的公開資料。
 */
export function toPublicPostSummary(record: PostSourceRecord): PublicPostSummary {
  return Object.freeze({
    slug: record.slug,
    title: record.title,
    excerpt: record.excerpt,
    coverImage: record.coverImage,
    publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
    category: record.category,
  });
}

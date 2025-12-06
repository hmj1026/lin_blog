import { PostStatus } from "@prisma/client";
import { z } from "zod";

/**
 * 文章資料庫 Schema (Zod)
 * 定義了文章的核心欄位與驗證規則
 */
export const postSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  content: z.string().min(1),
  coverImage: z.string().nullable().optional(),
  readingTime: z.string().nullable().optional(),
  featured: z.boolean().optional(),
  status: z.nativeEnum(PostStatus).optional(),
  publishedAt: z.date().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  authorId: z.string().cuid().nullable().optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
});

/**
 * API 專用 schema：publishedAt 接受 ISO 字串或 null
 */
export const postApiSchema = z.object({
  slug: z.string().min(1, "Slug 不能為空"),
  title: z.string().min(1, "標題不能為空"),
  excerpt: z.string().min(1, "摘要不能為空"),
  content: z.string().min(1, "內容不能為空"),
  coverImage: z.string().nullable().optional(),
  readingTime: z.string().nullable().optional(),
  featured: z.boolean().optional(),
  status: z.nativeEnum(PostStatus).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  authorId: z.string().cuid().nullable().optional(),
  categoryIds: z.array(z.string().cuid()).optional(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export type PostApiInput = z.infer<typeof postApiSchema>;

/**
 * 將 API 輸入轉換為 Use Case 需要的格式
 * 主要處理日期字串轉 Date 物件
 * 
 * @param input - API 輸入資料
 * @returns 轉換後的文章資料
 */
export function parsePostApiInput(input: PostApiInput): z.infer<typeof postSchema> {
  return {
    ...input,
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
  };
}

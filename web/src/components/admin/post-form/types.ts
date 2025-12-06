export type PostStatus = "DRAFT" | "PUBLISHED" | "SCHEDULED";

export type CategoryOption = { id: string; name: string };
export type TagOption = { id: string; name: string };

export type PostFormData = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  readingTime: string | null;
  featured: boolean;
  status: PostStatus;
  publishedAt: string | null;
  categoryIds: string[];
  tagIds: string[];
  // SEO 欄位
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
};

export type ApiResponse<T> = { success: true; data: T } | { success: false; message?: string; data?: null };

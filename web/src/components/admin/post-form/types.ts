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
  allowRawHtml: boolean;
  showRawHtmlToc?: boolean;
  status: PostStatus;
  publishedAt: string | null;
  categoryIds: string[];
  tagIds: string[];
  // SEO 欄位
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  // 樂觀鎖 token（ISO 字串）：載入文章時的 updatedAt，儲存時回傳供衝突偵測。edit 模式才有。
  updatedAt?: string | null;
};

export type ApiResponse<T> = { success: true; data: T } | { success: false; message?: string; data?: null };

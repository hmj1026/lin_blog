import type { PostStatus } from "../domain";

export type PostAuthorRecord = {
  id: string;
  name: string | null;
  email: string | null;
  deletedAt: Date | null;
};

export type PostVersionEditorRecord = {
  name: string | null;
  email: string | null;
};

export type CategoryRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  showInNav: boolean;
  navOrder: number;
  deletedAt: Date | null;
  postCount?: number;
};

export type TagRecord = {
  id: string;
  slug: string;
  name: string;
  deletedAt: Date | null;
  postCount?: number;
};

export type PostRecord = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  readingTime: string | null;
  featured: boolean;
  allowRawHtml: boolean;
  showRawHtmlToc: boolean;
  status: PostStatus;
  publishedAt: Date | null;
  // SEO 欄位
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  author: PostAuthorRecord | null;
  categories: CategoryRecord[];
  tags: TagRecord[];
};

export type PostListItemRecord = Omit<PostRecord, "content">;

export type PostVersionRecord = {
  id: string;
  postId: string;
  title: string;
  excerpt: string;
  content: string;
  allowRawHtml: boolean;
  showRawHtmlToc: boolean;
  editor: PostVersionEditorRecord | null;
  createdAt: Date;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type AdminPostSort = "updated-desc" | "created-desc" | "published-desc" | "title-asc";

export type AdminPostListParams = {
  query?: string;
  status?: PostStatus;
  categoryId?: string;
  tagId?: string;
  featured?: boolean;
  deleted: boolean;
  sort: AdminPostSort;
  page: number;
  pageSize: number;
};

export interface PostRepository {
  listPublished(params?: { categorySlug?: string; tag?: string; featured?: boolean; take?: number }): Promise<PostListItemRecord[]>;
  listPublishedPaginated(params: {
    page: number;
    pageSize: number;
    categorySlug?: string;
    tag?: string;
  }): Promise<PaginatedResult<PostListItemRecord>>;
  search(params: { query: string; take?: number }): Promise<PostListItemRecord[]>;
  listForAdmin(params: AdminPostListParams): Promise<PaginatedResult<PostListItemRecord>>;
  countPublished(): Promise<number>;
  countActive(): Promise<number>;
  listPublishedForSitemap(): Promise<Array<{ slug: string; updatedAt: Date; publishedAt: Date | null }>>;
  getBySlug(slug: string): Promise<PostRecord | null>;
  getById(id: string): Promise<PostRecord | null>;
  listRelated(params: {
    excludeSlug: string;
    categoryIds: string[];
    tagIds: string[];
    take: number;
  }): Promise<PostListItemRecord[]>;
  create(data: {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImage?: string | null;
    readingTime?: string | null;
    featured?: boolean;
    allowRawHtml?: boolean;
    showRawHtmlToc?: boolean;
    status: PostStatus;
    publishedAt?: Date | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    ogImage?: string | null;
    authorId?: string | null;
    categoryIds?: string[];
    tagIds?: string[];
  }): Promise<{ id: string }>;
  update(
    id: string,
    data: {
      slug: string;
      title: string;
      excerpt: string;
      content: string;
      coverImage?: string | null;
      readingTime?: string | null;
      featured?: boolean;
      allowRawHtml?: boolean;
      showRawHtmlToc?: boolean;
      status: PostStatus;
      publishedAt?: Date | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      ogImage?: string | null;
      authorId?: string | null;
      categoryIds?: string[] | null;
      tagIds?: string[] | null;
    }
  ): Promise<{ id: string }>;
  softDelete(id: string): Promise<{ id: string }>;
  restore(id: string): Promise<{ id: string }>;

  /**
   * 原子地「快照當前文章版本 + 樂觀鎖更新文章」。
   * 於單一 transaction 內先寫入 version 快照，再以 `updatedAt === expectedUpdatedAt`
   * 為條件更新文章；條件不符（他人已更新）回 `conflict`，文章不存在回 `not-found`，
   * 兩者皆會 rollback 版本快照，避免版本歷史在並行更新／還原時遺失內容。
   */
  updateWithVersion(params: {
    id: string;
    expectedUpdatedAt: Date;
    version: {
      title: string;
      excerpt: string;
      content: string;
      allowRawHtml?: boolean;
      showRawHtmlToc?: boolean;
      editorId?: string | null;
    };
    update: {
      slug: string;
      title: string;
      excerpt: string;
      content: string;
      coverImage?: string | null;
      readingTime?: string | null;
      featured?: boolean;
      allowRawHtml?: boolean;
      showRawHtmlToc?: boolean;
      status: PostStatus;
      publishedAt?: Date | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
      ogImage?: string | null;
      authorId?: string | null;
      categoryIds?: string[] | null;
      tagIds?: string[] | null;
    };
  }): Promise<{ ok: true; id: string; updatedAt: Date } | { ok: false; reason: "conflict" | "not-found" }>;

  batchAction(params: { action: "publish" | "draft" | "delete"; postIds: string[] }): Promise<{
    count: number;
    results: Array<{ id: string; ok: boolean; error?: "not-applicable" }>;
  }>;
  publishDueScheduled(now: Date): Promise<{ count: number; published: Array<{ id: string; slug: string; publishedAt: Date | null }> }>;
  listForExport(params: { ids?: string[]; orderBy?: "createdAtDesc" }): Promise<
    Array<{
      slug: string;
      title: string;
      excerpt: string;
      content: string;
      coverImage: string | null;
      readingTime: string | null;
      featured: boolean;
      allowRawHtml: boolean;
      showRawHtmlToc: boolean;
      status: PostStatus;
      publishedAt: Date | null;
      seoTitle: string | null;
      seoDescription: string | null;
      ogImage: string | null;
      categories: Array<{ slug: string; name: string }>;
      tags: Array<{ slug: string; name: string }>;
      createdAt: Date;
      updatedAt: Date;
    }>
  >;
}

export interface PostVersionRepository {
  listByPostId(postId: string): Promise<PostVersionRecord[]>;
  getById(params: { postId: string; versionId: string }): Promise<PostVersionRecord | null>;
  create(data: {
    postId: string;
    title: string;
    excerpt: string;
    content: string;
    allowRawHtml?: boolean;
    showRawHtmlToc?: boolean;
    editorId?: string | null;
  }): Promise<{ id: string }>;
}

export interface CategoryRepository {
  listActive(params?: { showInNav?: boolean }): Promise<CategoryRecord[]>;
  listAll(): Promise<CategoryRecord[]>;
  countActive(): Promise<number>;
  getBySlug(slug: string): Promise<CategoryRecord | null>;
  create(data: { slug: string; name: string; showInNav?: boolean; navOrder?: number }): Promise<{ id: string }>;
  update(
    id: string,
    data: { slug: string; name: string; showInNav?: boolean; navOrder?: number; deletedAt?: Date | null }
  ): Promise<{ id: string }>;
  softDelete(id: string): Promise<{ id: string }>;
  restore(id: string): Promise<{ id: string }>;
  countPostsByCategory(categoryId: string): Promise<number>;
  merge(sourceId: string, targetId: string): Promise<{ id: string; movedPosts: number }>;
}

export interface TagRepository {
  listActive(): Promise<TagRecord[]>;
  listAll(): Promise<TagRecord[]>;
  countActive(): Promise<number>;
  findBySlugOrName(value: string): Promise<TagRecord[]>;
  create(data: { slug: string; name: string }): Promise<{ id: string }>;
  update(id: string, data: { slug: string; name: string; deletedAt?: Date | null }): Promise<{ id: string }>;
  softDelete(id: string): Promise<{ id: string }>;
  restore(id: string): Promise<{ id: string }>;
  merge(sourceId: string, targetId: string): Promise<{ id: string; movedPosts: number }>;
}

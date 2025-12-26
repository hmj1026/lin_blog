import type { PostStatus } from "./post-status";
import type { Slug } from "./slug";

/**
 * Post 領域模型
 *
 * 封裝文章的核心狀態和業務邏輯
 *
 * @example
 * ```typescript
 * const post = Post.create({
 *   id: "123",
 *   slug: parseSlug("my-post"),
 *   status: "PUBLISHED",
 *   publishedAt: new Date(),
 *   deletedAt: null,
 * });
 *
 * if (post.isPublished()) {
 *   // 處理已發布文章
 * }
 * ```
 */
export class Post {
  private constructor(
    public readonly id: string,
    public readonly slug: Slug,
    public readonly status: PostStatus,
    public readonly publishedAt: Date | null,
    public readonly deletedAt: Date | null
  ) {}

  /**
   * 建立 Post 實例
   */
  static create(props: {
    id: string;
    slug: Slug;
    status: PostStatus;
    publishedAt: Date | null;
    deletedAt: Date | null;
  }): Post {
    return new Post(
      props.id,
      props.slug,
      props.status,
      props.publishedAt,
      props.deletedAt
    );
  }

  /**
   * 從資料物件建立 Post 實例
   */
  static fromData(data: {
    id: string;
    slug: string;
    status: PostStatus;
    publishedAt: Date | null;
    deletedAt: Date | null;
  }): Post {
    return new Post(
      data.id,
      data.slug as Slug,
      data.status,
      data.publishedAt,
      data.deletedAt
    );
  }

  /**
   * 是否已發布
   */
  isPublished(): boolean {
    return this.status === "PUBLISHED" && this.deletedAt === null;
  }

  /**
   * 是否為草稿
   */
  isDraft(): boolean {
    return this.status === "DRAFT" && this.deletedAt === null;
  }

  /**
   * 是否為排程發布
   */
  isScheduled(): boolean {
    return this.status === "SCHEDULED" && this.deletedAt === null;
  }

  /**
   * 是否已刪除（軟刪除）
   */
  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /**
   * 是否可被閱讀
   *
   * @param allowDraft - 是否允許閱讀草稿（預覽模式）
   */
  canView(allowDraft: boolean = false): boolean {
    if (this.isDeleted()) return false;
    if (this.isPublished()) return true;
    if (allowDraft && this.isDraft()) return true;
    return false;
  }

  /**
   * 是否可被編輯
   */
  canEdit(): boolean {
    return !this.isDeleted();
  }

  /**
   * 轉換為純資料物件
   */
  toData(): {
    id: string;
    slug: string;
    status: PostStatus;
    publishedAt: Date | null;
    deletedAt: Date | null;
  } {
    return {
      id: this.id,
      slug: this.slug,
      status: this.status,
      publishedAt: this.publishedAt,
      deletedAt: this.deletedAt,
    };
  }
}

/**
 * Post 型別（用於向後相容）
 * @deprecated 請使用 Post class
 */
export type PostData = {
  id: string;
  slug: Slug;
  status: PostStatus;
  publishedAt: Date | null;
  deletedAt: Date | null;
};

import type { PostStatus } from "./post-status";
import type { Slug } from "./slug";

export type Post = {
  id: string;
  slug: Slug;
  status: PostStatus;
  publishedAt: Date | null;
  deletedAt: Date | null;
};

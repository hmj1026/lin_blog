import type { PostRecord } from "@/modules/posts/application/ports";

export type PostWithRelations = {
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  readingTime: string | null;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  categories: Array<{ name: string; deletedAt: Date | null }>;
  tags: Array<{ name: string; deletedAt: Date | null }>;
  author: { name: string | null } | null;
};

export type FrontendPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  readingTime: string;
  author: { name: string; title?: string | null; initials?: string | null; tone?: "amber" | "teal" | "blue" | "rose" | null };
  hero: string;
  featured?: boolean;
};

function formatDate(value: Date | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function toFrontendPost(post: PostWithRelations): FrontendPost {
  const categories = post.categories.filter((category) => category.deletedAt == null);
  const tags = Array.from(new Set(post.tags.filter((tag) => tag.deletedAt == null).map((tag) => tag.name)));
  const category = categories[0]?.name ?? "未分類";
  const hero = post.coverImage ?? "/images/hero-community.svg";

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    category,
    tags,
    date: formatDate(post.publishedAt ?? post.createdAt),
    readingTime: post.readingTime ?? "",
    author: { name: post.author?.name ?? "Lin Blog" },
    hero,
    featured: post.featured,
  };
}

export type PostByIdResponse = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  readingTime: string | null;
  featured: boolean;
  status: PostRecord["status"];
  publishedAt: Date | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null } | null; // NO email, NO password
  categories: Array<{ id: string; slug: string; name: string }>;
  tags: Array<{ id: string; slug: string; name: string }>;
};

export function toPostByIdResponse(post: PostRecord): PostByIdResponse {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    coverImage: post.coverImage,
    readingTime: post.readingTime,
    featured: post.featured,
    status: post.status,
    publishedAt: post.publishedAt,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    ogImage: post.ogImage,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author ? { id: post.author.id, name: post.author.name } : null,
    categories: post.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
    tags: post.tags.map((t) => ({ id: t.id, slug: t.slug, name: t.name })),
  };
}

import Image from "next/image";
import Link from "next/link";
import { Badge } from "./ui/badge";
import { AuthorChip } from "./author-chip";
import { FrontendPost } from "@/lib/frontend/post";

type PostCardProps = {
  post: FrontendPost;
  layout?: "vertical" | "horizontal";
};

export function PostCard({ post, layout = "vertical" }: PostCardProps) {
  const isHorizontal = layout === "horizontal";
  const unoptimized = post.hero.startsWith("/api/files/");

  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`group rounded-2xl border border-line bg-white p-5 shadow-card transition hover:-translate-y-1 hover:shadow-soft dark:bg-base-100 dark:border-base-200 ${
        isHorizontal ? "grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_1fr]" : "space-y-4"
      }`}
    >
      <div className={`relative overflow-hidden rounded-xl ${isHorizontal ? "aspect-[3/2]" : "aspect-[16/10]"}`}>
        <Image
          src={post.hero}
          alt={post.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={post.featured}
          unoptimized={unoptimized}
        />
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-base-300 dark:text-base-600">
          <Badge label={post.category} tone="accent" />
          <span>{post.date}</span>
          <span aria-hidden>•</span>
          <span>{post.readingTime}</span>
        </div>
        <h3 className="font-display text-xl leading-snug text-primary transition group-hover:text-accent-600 dark:group-hover:text-accent-600">
          {post.title}
        </h3>
        <p className="text-sm text-base-300 dark:text-base-600">{post.excerpt}</p>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-base-100 dark:bg-base-50 px-3 py-1 text-xs font-semibold text-primary">
              #{tag}
            </span>
          ))}
        </div>
        <AuthorChip author={post.author} />
      </div>
    </Link>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { toFrontendPost } from "@/lib/frontend/post";
import { postsUseCases } from "@/modules/posts";

type TagPageProps = {
  params: Promise<{ tag: string }>;
};

export default async function TagPage({ params }: TagPageProps) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const tagRows = await postsUseCases.findTagsBySlugOrName(decoded);
  const liveTagRows = tagRows.filter((t) => t.deletedAt == null);
  if (liveTagRows.length === 0) return notFound();

  const filteredRaw = await postsUseCases.listPublishedPosts({ tag: decoded });
  const filtered = filteredRaw.map(toFrontendPost);

  return (
    <div className="space-y-12">
      <section className="section-shell space-y-3 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">Tag</p>
        <h1 className="font-display text-4xl text-primary">#{decoded}</h1>
        <p className="text-base text-base-300 dark:text-base-600">與 #{decoded} 相關的案例與指南，幫你快速找到可複製的做法。</p>
        <Link href="/blog" className="text-sm font-semibold text-accent-600 hover:text-accent-500">
          返回部落格
        </Link>
      </section>

      <section className="section-shell space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-line bg-white p-6 text-center text-base text-base-300 dark:bg-base-100 dark:text-base-600">
            這個標籤目前沒有文章。
          </p>
        )}
      </section>
    </div>
  );
}

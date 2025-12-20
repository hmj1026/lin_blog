import { notFound } from "next/navigation";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { toFrontendPost } from "@/lib/frontend/post";
import { postsUseCases } from "@/modules/posts";

type CategoryPageProps = {
  params: Promise<{ category: string }>;
};

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  const categoryRow = await postsUseCases.getCategoryBySlug(decoded);
  if (!categoryRow) return notFound();

  const filteredRaw = await postsUseCases.listPublishedPosts({ categorySlug: decoded });
  const filtered = filteredRaw.map(toFrontendPost);

  return (
    <div className="space-y-12">
      <section className="section-shell space-y-3 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">Category</p>
        <h1 className="font-display text-4xl text-primary">{decoded}</h1>
        <p className="text-base text-base-300">探索 {decoded} 相關的策略、案例與操作手冊。挑選一篇開始落地。</p>
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
          <p className="rounded-2xl border border-line bg-white p-6 text-center text-base text-base-300">
            這個分類目前沒有文章。
          </p>
        )}
      </section>
    </div>
  );
}

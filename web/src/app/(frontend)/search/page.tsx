import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { toFrontendPost } from "@/lib/frontend/post";
import { postsUseCases } from "@/modules/posts";

// 強制動態渲染，避免 build 時嘗試連接資料庫
export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params?.q ? decodeURIComponent(params.q) : "";

  const posts = query.trim()
    ? await postsUseCases.searchPosts({ query, take: 20 })
    : [];

  const results = posts.map(toFrontendPost);

  return (
    <div className="section-shell space-y-8 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">
          搜尋結果
        </p>
        <h1 className="font-display text-3xl text-primary">
          {query ? `「${query}」` : "搜尋文章"}
        </h1>
        {query && (
          <p className="text-base-300 dark:text-base-600">
            共找到 {results.length} 篇相關文章
          </p>
        )}
      </div>

      {/* 搜尋表單 */}
      <form action="/search" method="GET" className="flex gap-3">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="輸入關鍵字搜尋..."
          className="flex-1 rounded-xl border border-line bg-base-50 px-4 py-3 text-sm text-primary placeholder:text-base-300 focus:border-primary focus:outline-none dark:bg-base-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
        >
          搜尋
        </button>
      </form>

      {/* 搜尋結果 */}
      {results.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {results.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      ) : query ? (
        <div className="rounded-2xl border border-line bg-white p-8 text-center dark:bg-base-100">
          <p className="text-lg font-semibold text-primary">找不到相關文章</p>
          <p className="mt-2 text-base-300 dark:text-base-600">
            試試其他關鍵字，或{" "}
            <Link href="/blog" className="text-accent-600 hover:underline">
              瀏覽所有文章
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-8 text-center dark:bg-base-100">
          <p className="text-base-300 dark:text-base-600">輸入關鍵字開始搜尋</p>
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { SearchResultCard } from "@/components/discovery/search-result-card";
import { discoveryQueries } from "@/lib/server-queries";
import { parseSearchPage } from "@/modules/discovery/application/parse-search-page";

// 依查詢字串與頁碼動態渲染，output 隨 ?q/?page 變動，無法用 ISR 快取（見 fix-perf-caching spec Scenario 4）
export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  // Next.js 已對 searchParams 完成 URL decode；再呼叫 decodeURIComponent 會對
  // 含 %（如「100%」）的查詢拋 URIError 使整頁 500，故直接使用原值。
  const query = params?.q ?? "";
  const requestedPage = parseSearchPage(params?.page);

  const result = await discoveryQueries.searchPublicPosts({ query, page: requestedPage });

  const totalPages =
    result.kind === "results" ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;
  const currentPage = result.kind === "results" ? result.page : 1;

  return (
    <div className="section-shell space-y-8 py-12">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">
          搜尋結果
        </p>
        <h1 className="font-display text-3xl text-primary">
          {query ? `「${query}」` : "搜尋文章"}
        </h1>
        {result.kind === "results" && (
          <p className="text-base-300 dark:text-base-600">
            共找到 {result.total} 篇相關文章
          </p>
        )}
      </div>

      {/* 搜尋表單：visible label 供鍵盤／screen reader 辨識（discovery a11y 規格） */}
      <form action="/search" method="GET" className="space-y-2">
        <label htmlFor="search-page-q" className="block text-sm font-semibold text-primary">
          搜尋關鍵字
        </label>
        <div className="flex gap-3">
        <input
          id="search-page-q"
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
        </div>
      </form>

      {/* 搜尋結果 */}
      {result.kind === "results" && result.items.length > 0 ? (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            {result.items.map((post) => (
              <SearchResultCard key={post.slug} post={post} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              aria-label="搜尋結果分頁"
              className="flex items-center justify-center gap-4 text-sm"
            >
              {currentPage > 1 ? (
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&page=${currentPage - 1}`}
                  rel="prev"
                  className="rounded-lg border border-line px-4 py-2 font-semibold text-primary transition hover:border-primary/40"
                >
                  上一頁
                </Link>
              ) : (
                <span className="rounded-lg border border-line px-4 py-2 font-semibold text-base-300 opacity-50 dark:text-base-600">
                  上一頁
                </span>
              )}

              <span className="text-base-300 dark:text-base-600" aria-current="page">
                第 {currentPage} / {totalPages} 頁
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={`/search?q=${encodeURIComponent(query)}&page=${currentPage + 1}`}
                  rel="next"
                  className="rounded-lg border border-line px-4 py-2 font-semibold text-primary transition hover:border-primary/40"
                >
                  下一頁
                </Link>
              ) : (
                <span className="rounded-lg border border-line px-4 py-2 font-semibold text-base-300 opacity-50 dark:text-base-600">
                  下一頁
                </span>
              )}
            </nav>
          )}
        </div>
      ) : result.kind === "error" ? (
        <div
          role="status"
          className="rounded-2xl border border-line bg-white p-8 text-center dark:bg-base-100"
        >
          <p className="text-lg font-semibold text-primary">搜尋暫時無法使用</p>
          <p className="mt-2 text-base-300 dark:text-base-600">請稍後再試一次。</p>
        </div>
      ) : result.kind === "results" && result.total > 0 ? (
        // 有結果但請求的頁碼超出範圍：不誤報「找不到相關文章」，導引回第一頁
        <div className="rounded-2xl border border-line bg-white p-8 text-center dark:bg-base-100">
          <p className="text-lg font-semibold text-primary">此頁沒有更多結果</p>
          <p className="mt-2 text-base-300 dark:text-base-600">
            <Link
              href={`/search?q=${encodeURIComponent(query)}&page=1`}
              className="text-accent-600 hover:underline"
            >
              回到第一頁
            </Link>
          </p>
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

import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { Pagination } from "@/components/pagination";
import { toFrontendPost } from "@/lib/frontend/post";
import { postsUseCases } from "@/modules/posts";

const PAGE_SIZE = 10;

type BlogPageProps = {
  searchParams?: Promise<{
    category?: string;
    tag?: string;
    page?: string;
  }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const activeCategory = params?.category ? decodeURIComponent(params.category) : undefined;
  const activeTag = params?.tag ? decodeURIComponent(params.tag) : undefined;
  const currentPage = Math.max(1, Number(params?.page) || 1);

  const [categoryRows, tagRows, paginatedResult] = await Promise.all([
    postsUseCases.listActiveCategories(),
    postsUseCases.listActiveTags(),
    postsUseCases.listPublishedPostsPaginated({
      page: currentPage,
      pageSize: PAGE_SIZE,
      categorySlug: activeCategory,
      tag: activeTag,
    }),
  ]);

  const categories = categoryRows.map((c) => c.name);
  const tags = Array.from(new Set(tagRows.map((t) => t.name)));
  const filtered = paginatedResult.data.map(toFrontendPost);
  const { pagination } = paginatedResult;

  // 構建分頁的 query params
  const paginationQueryParams: Record<string, string> = {};
  if (activeCategory) paginationQueryParams.category = activeCategory;
  if (activeTag) paginationQueryParams.tag = activeTag;

  return (
    <div className="space-y-16">
      <section className="bg-white/70 dark:bg-base-100">
        <div className="section-shell grid gap-8 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-600">Blog</p>
            <h1 className="font-display text-4xl text-primary">部落格：策略 × 設計 × 社群</h1>
            <p className="text-base text-base-300 dark:text-base-600">
              精選以社群為核心的內容策略、設計實務與營運心法。挑選分類或標籤，找到下一步要實作的指南。
            </p>
            <div className="flex flex-wrap gap-4">
              <div>
                <div className="text-2xl font-display text-primary">{pagination.total}</div>
                <div className="text-xs text-base-300 dark:text-base-600">篇文章</div>
              </div>
              <div>
                <div className="text-2xl font-display text-primary">{categories.length}</div>
                <div className="text-xs text-base-300 dark:text-base-600">分類</div>
              </div>
              <div>
                <div className="text-2xl font-display text-primary">{tags.length}</div>
                <div className="text-xs text-base-300 dark:text-base-600">標籤</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-white p-6 shadow-soft dark:bg-base-100 dark:border-amber-500/20 dark:shadow-lg dark:shadow-amber-500/5">
            {/* 篩選區標題 - dark mode 使用金色主題 */}
            <div className="flex flex-col gap-2 items-start text-left mb-4">
              <span className="inline-flex items-center rounded-full bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-accent-600 dark:bg-amber-500/10 dark:text-amber-400">
                篩選
              </span>
              <h2 className="font-display text-3xl leading-tight text-primary dark:text-amber-50">找到你要的主題</h2>
              <p className="max-w-2xl text-base text-base-300 dark:text-amber-200/60">從分類或標籤開始，快速進入最相關的文章。</p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <FilterChip label="全部分類" href="/blog" active={!activeCategory} />
                {categories.map((category) => (
                  <FilterChip
                    key={category}
                    label={category}
                    href={`/blog?category=${encodeURIComponent(category)}`}
                    active={activeCategory === category}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <FilterChip label="全部標籤" href="/blog" active={!activeTag} />
                {tags.map((tag) => (
                  <FilterChip
                    key={tag}
                    label={`#${tag}`}
                    href={`/blog?tag=${encodeURIComponent(tag)}`}
                    active={activeTag === tag}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-line bg-white p-6 text-center text-base text-base-300 dark:bg-base-100 dark:text-base-600">
            找不到符合的文章，換個分類或標籤試試。
          </p>
        )}
        
        {/* 分頁 */}
        {pagination.totalPages > 1 && (
          <div className="pt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              baseUrl="/blog"
              queryParams={paginationQueryParams}
            />
          </div>
        )}
      </section>

      <section className="section-shell">
        <NewsletterForm />
      </section>
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  const baseClasses = "rounded-full border px-4 py-2 text-xs font-semibold transition";
  const activeClasses = "border-accent-600 bg-accent-600 text-white shadow-card dark:border-amber-400 dark:bg-amber-500 dark:text-stone-900";
  const inactiveClasses = "border-line bg-white text-primary hover:border-primary/40";
  const inactiveDarkClasses = "dark:bg-[#2d2928] dark:border-amber-400/30 dark:text-amber-100/80 dark:hover:border-amber-400/50";

  return (
    <Link
      href={href as never}
      className={`${baseClasses} ${active ? activeClasses : `${inactiveClasses} ${inactiveDarkClasses}`}`}
    >
      {label}
    </Link>
  );
}

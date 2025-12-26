import Image from "next/image";
import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { SectionHeader } from "@/components/section-header";
import { NewsletterForm } from "@/components/newsletter-form";
import { ContactCard } from "@/components/contact-card";
import { Badge } from "@/components/ui/badge";
import { AuthorChip } from "@/components/author-chip";
import { toFrontendPost } from "@/lib/frontend/post";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";

// 強制動態渲染，避免 build 時嘗試連接資料庫
export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredRaw, latestRaw, categories, settings] = await Promise.all([
    postsUseCases.listPublishedPosts({ featured: true, take: 2 }),
    postsUseCases.listPublishedPosts({ take: 6 }),
    postsUseCases.listActiveCategories({ showInNav: true }),
    siteSettingsUseCases.getOrCreateDefault(),
  ]);

  const featuredPosts = featuredRaw.map(toFrontendPost);
  const latestPosts = latestRaw.map(toFrontendPost);

  // 動態值（使用資料庫設定或預設值）
  const heroBadge = settings.heroBadge ?? "Client-First Blog · 社群驅動";
  const heroTitle = settings.heroTitle ?? "打造以「社群參與」為核心的內容體驗";
  const heroSubtitle = settings.heroSubtitle ?? "每篇文章都經過設計、敘事與互動的精修，讓讀者不只點擊，更願意分享、回訪與共創。在這裡，你會找到實戰框架、版型拆解與可直接複製的腳本。";
  const heroImage = settings.heroImage ?? "/images/hero-community.svg";
  const statsArticles = settings.statsArticles ?? "120+";
  const statsSubscribers = settings.statsSubscribers ?? "35K";
  const statsRating = settings.statsRating ?? "4.8 ★";

  // 區塊標題（從 settings 讀取）
  const featuredTitle = settings.featuredTitle ?? "熱門精選：近期最受討論的文章";
  const featuredDesc = settings.featuredDesc ?? "從設計到營運的實戰拆解，帶你快速套用到自己的內容與社群場景。";
  const categoriesTitle = settings.categoriesTitle ?? "三大主題，讓內容與社群形成循環";
  const categoriesDesc = settings.categoriesDesc ?? "從策略到設計、從社群到執行，這些分類幫助你快速找到需要的工具與視角。";
  const latestTitle = settings.latestTitle ?? "最新文章";
  const latestDesc = settings.latestDesc ?? "每篇都附上可落地的步驟、檢查清單與案例，直接帶回你的團隊。";
  const communityTitle = settings.communityTitle ?? "每週 AMA 與讀者共創";
  const communityDesc = settings.communityDesc ?? "提交你的問題，或分享你的執行成果。精選會被收錄進下一篇案例拆解。";

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10">
        <div className="section-shell grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-accent-600 shadow-card dark:bg-base-100 dark:border-base-200">
              {heroBadge}
            </div>
            <h1 className="font-display text-4xl leading-tight text-primary md:text-5xl">
              {heroTitle}
            </h1>
            <p className="max-w-2xl text-lg text-base-300 dark:text-base-600">
              {heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5"
              >
                閱讀最新文章
              </Link>
            </div>
            {/* 統計區塊 - 暫時隱藏
            <div className="flex flex-wrap gap-6 rounded-2xl border border-line bg-white/80 p-6 shadow-card backdrop-blur dark:bg-base-100 dark:border-base-200">
              <div>
                <div className="text-3xl font-display text-primary">{statsArticles}</div>
                <div className="text-sm text-base-300 dark:text-base-600">深度文章</div>
              </div>
              <div>
                <div className="text-3xl font-display text-primary">{statsSubscribers}</div>
                <div className="text-sm text-base-300 dark:text-base-600">Newsletter 訂閱</div>
              </div>
              <div>
                <div className="text-3xl font-display text-primary">{statsRating}</div>
                <div className="text-sm text-base-300 dark:text-base-600">讀者評價</div>
              </div>
            </div>
            */}
          </div>
          <div className="relative">
            <div className="absolute inset-0 -left-10 -z-10 rotate-3 rounded-[36px] bg-gradient-to-br from-orange-100 via-white to-sky-100 dark:from-orange-900/20 dark:via-base-75 dark:to-sky-900/20" />
            <div className="glass-card relative overflow-hidden rounded-[32px]">
              <div className="grid-overlay absolute inset-0 opacity-50" />
              <Image
                src={heroImage}
                alt="Community hero"
                width={900}
                height={520}
                className="h-full w-full object-cover"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/90 to-transparent p-6 text-white dark:from-black/80 dark:via-black/50">
                <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em]">
                  <span className="h-1 w-12 rounded-full bg-orange-300" />
                  FEATURED STORY
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <Badge label="社群" tone="accent" />
                  <span>讓讀者參與共創，形成內容飛輪</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Posts Section */}
      <section className="section-shell space-y-8">
        <SectionHeader
          eyebrow="Featured"
          title={featuredTitle}
          description={featuredDesc}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {featuredPosts.map((post) => (
            <PostCard key={post.slug} post={post} layout="horizontal" />
          ))}
        </div>
      </section>

      {/* Categories Section - 動態讀取分類 */}
      <section className="section-shell space-y-6">
        <SectionHeader
          eyebrow="Categories"
          title={categoriesTitle}
          description={categoriesDesc}
        />
        <div className="grid gap-6 md:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${encodeURIComponent(category.slug)}`}
              className="group rounded-2xl border border-line bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft dark:bg-base-100"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-primary">{category.name}</h3>
                <span className="text-sm text-accent-600 transition group-hover:translate-x-1">閱讀</span>
              </div>
              {category.description && (
                <p className="mt-2 text-sm text-base-300 dark:text-base-600">{category.description}</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Posts Section */}
      <section className="section-shell space-y-6">
        <SectionHeader
          eyebrow="Latest"
          title={latestTitle}
          description={latestDesc}
        />
        <div className="grid gap-6 md:grid-cols-2">
          {latestPosts.slice(0, 4).map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>

      {/* Newsletter Section - 依設定顯示/隱藏 */}
      {settings.showNewsletter && (
        <section className="section-shell">
          <NewsletterForm />
        </section>
      )}

      {/* Community & Contact Section - 暫時隱藏
      <section className="section-shell space-y-8">
        <div className={`grid gap-6 lg:items-center ${settings.showContact ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}>
          <div className="space-y-4 rounded-3xl border border-line bg-white p-8 shadow-soft dark:bg-base-100">
            <SectionHeader
              eyebrow="Community"
              title={communityTitle}
              description={communityDesc}
            />
            <div className="space-y-3">
              {latestPosts.slice(0, 3).map((post) => (
                <div
                  key={post.slug}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-base-50/70 p-4 transition hover:border-accent-500/50 dark:bg-base-75/70"
                >
                  <div className="flex items-center justify-between text-xs text-base-300 dark:text-base-600">
                    <Badge label={post.category} />
                    <span>{post.date}</span>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-semibold text-primary transition hover:text-accent-600"
                  >
                    {post.title}
                  </Link>
                  <p className="text-sm text-base-300 dark:text-base-600 line-clamp-2">{post.excerpt}</p>
                  <AuthorChip author={post.author} />
                </div>
              ))}
            </div>
          </div>
          {settings.showContact && <ContactCard socialLinks={settings} />}
        </div>
      </section>
      */}
    </div>
  );
}

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

export default async function Home() {
  const [featuredRaw, latestRaw] = await Promise.all([
    postsUseCases.listPublishedPosts({ featured: true, take: 2 }),
    postsUseCases.listPublishedPosts({ take: 6 }),
  ]);

  const featuredPosts = featuredRaw.map(toFrontendPost);
  const latestPosts = latestRaw.map(toFrontendPost);

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden pt-10">
        <div className="section-shell grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-accent-600 shadow-card">
              Client-First Blog · 社群驅動
            </div>
            <h1 className="font-display text-4xl leading-tight text-primary md:text-5xl">
              打造以「社群參與」為核心的內容體驗
            </h1>
            <p className="max-w-2xl text-lg text-base-300">
              每篇文章都經過設計、敘事與互動的精修，讓讀者不只點擊，更願意分享、回訪與共創。
              在這裡，你會找到實戰框架、版型拆解與可直接複製的腳本。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5"
              >
                閱讀最新文章
              </Link>
              <Link
                href="#newsletter"
                className="inline-flex items-center rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-primary transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                訂閱每週摘要
              </Link>
            </div>
            <div className="flex flex-wrap gap-6 rounded-2xl border border-line bg-white/80 p-6 shadow-card backdrop-blur">
              <div>
                <div className="text-3xl font-display text-primary">120+</div>
                <div className="text-sm text-base-300">深度文章</div>
              </div>
              <div>
                <div className="text-3xl font-display text-primary">35K</div>
                <div className="text-sm text-base-300">Newsletter 訂閱</div>
              </div>
              <div>
                <div className="text-3xl font-display text-primary">4.8 ★</div>
                <div className="text-sm text-base-300">讀者評價</div>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 -left-10 -z-10 rotate-3 rounded-[36px] bg-gradient-to-br from-orange-100 via-white to-sky-100" />
            <div className="glass-card relative overflow-hidden rounded-[32px]">
              <div className="grid-overlay absolute inset-0 opacity-50" />
              <Image
                src="/images/hero-community.svg"
                alt="Community hero"
                width={900}
                height={520}
                className="h-full w-full object-cover"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/90 to-transparent p-6 text-white">
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

      <section className="section-shell space-y-8">
        <SectionHeader
          eyebrow="Featured"
          title="熱門精選：近期最受討論的文章"
          description="從設計到營運的實戰拆解，帶你快速套用到自己的內容與社群場景。"
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {featuredPosts.map((post) => (
            <PostCard key={post.slug} post={post} layout="horizontal" />
          ))}
        </div>
      </section>

      <section className="section-shell space-y-6">
        <SectionHeader
          eyebrow="Categories"
          title="三大主題，讓內容與社群形成循環"
          description="從策略到設計、從社群到執行，這些分類幫助你快速找到需要的工具與視角。"
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "策略",
              desc: "架構內容飛輪、Newsletter 成長、關鍵指標設計。",
              chips: ["內容企劃", "Growth", "Newsletter"],
            },
            {
              title: "設計",
              desc: "版面節奏、模組化設計、無障礙與響應式實踐。",
              chips: ["版型", "Design System", "可讀性"],
            },
            {
              title: "社群",
              desc: "儀式感、參與機制與活動腳本，累積忠誠度。",
              chips: ["互動", "活動設計", "營運"],
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={`/category/${item.title}`}
              className="group rounded-2xl border border-line bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-soft"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl text-primary">{item.title}</h3>
                <span className="text-sm text-accent-600 transition group-hover:translate-x-1">閱讀</span>
              </div>
              <p className="mt-2 text-sm text-base-300">{item.desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.chips.map((chip) => (
                  <span
                    key={`${item.title}-${chip}`}
                    className="rounded-full bg-base-100 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    #{chip}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell space-y-6">
        <SectionHeader
          eyebrow="Latest"
          title="最新文章"
          description="每篇都附上可落地的步驟、檢查清單與案例，直接帶回你的團隊。"
        />
        <div className="grid gap-6 md:grid-cols-2">
          {latestPosts.slice(0, 4).map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </section>

      <section className="section-shell">
        <NewsletterForm />
      </section>

      <section className="section-shell space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4 rounded-3xl border border-line bg-white p-8 shadow-soft">
            <SectionHeader
              eyebrow="Community"
              title="每週 AMA 與讀者共創"
              description="提交你的問題，或分享你的執行成果。精選會被收錄進下一篇案例拆解。"
            />
            <div className="space-y-3">
              {latestPosts.slice(0, 3).map((post) => (
                <div
                  key={post.slug}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-base-50/70 p-4 transition hover:border-accent-500/50"
                >
                  <div className="flex items-center justify-between text-xs text-base-300">
                    <Badge label={post.category} />
                    <span>{post.date}</span>
                  </div>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="font-semibold text-primary transition hover:text-accent-600"
                  >
                    {post.title}
                  </Link>
                  <p className="text-sm text-base-300 line-clamp-2">{post.excerpt}</p>
                  <AuthorChip author={post.author} />
                </div>
              ))}
            </div>
          </div>
          <ContactCard />
        </div>
      </section>
    </div>
  );
}

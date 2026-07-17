import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthorChip } from "@/components/author-chip";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/post-card";
import { InlineToc } from "@/components/inline-toc";
import { StreamedPostDiscoveryPanel } from "@/components/discovery/streamed-post-discovery-panel";
import { ReadingProgress } from "@/components/reading-progress";
import { ShareButtons } from "@/components/share-buttons";
import { prepareForRender } from "@/lib/content-pipeline";
import { RawHtmlPostFrame } from "@/components/raw-html-post-frame";
import { toFrontendPost } from "@/lib/frontend/post";
import { draftMode } from "next/headers";
import { PostViewTracker } from "@/components/post-view-tracker";
import { postsQueries, siteSettingsQueries } from "@/lib/server-queries";
import { getSiteUrl } from "@/lib/utils/url";

// ISR：60 秒重新驗證快取，草稿預覽透過 draftMode 繞過快取（見 /api/preview）
export const revalidate = 60;

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PostPage({ params }: PostPageProps) {
  const { slug: rawSlug } = await params;
  // Decode URL-encoded slug (e.g., Chinese characters)
  const slug = decodeURIComponent(rawSlug);
  const { isEnabled: allowDraft } = await draftMode();
  const post = await postsQueries.getReadablePostBySlug({ slug, allowDraft });
  if (!post) return notFound();

  const relatedRaw = await postsQueries.listRelatedPublishedPosts({ post });

  const postView = toFrontendPost(post);
  const related = relatedRaw.map(toFrontendPost);
  const { html: contentHtml, tocItems, strategy } = prepareForRender(
    postView.content,
    postView.allowRawHtml
  );
  const isRawHtmlPost = strategy === "iframe";
  const analyticsSource: "frontend" | "preview" = allowDraft || post.status !== "PUBLISHED" ? "preview" : "frontend";
  const siteUrl = getSiteUrl();
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  return (
    <>
      <ReadingProgress />
      <article className="space-y-16">
        <PostViewTracker slug={post.slug} source={analyticsSource} />
        <header className="bg-white/70 dark:bg-[#2a2320]/60">
          <div className="section-shell grid gap-8 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-xs text-base-300 dark:text-amber-200/50">
                <Badge variant="accent" className="dark:bg-[#4a3f38] dark:text-amber-200 dark:border dark:border-[#5a4d44]">{postView.category}</Badge>
                <span>{postView.date}</span>
                <span aria-hidden>•</span>
                <span>{postView.readingTime}</span>
              </div>
              <h1 className="font-display text-4xl leading-tight text-primary dark:text-amber-100">{postView.title}</h1>
              <p className="text-lg text-base-300 dark:text-amber-200/60">{postView.excerpt}</p>
              <AuthorChip author={postView.author} />
            </div>
            <div className="overflow-hidden rounded-3xl border border-line shadow-card dark:border-[#4a403a] dark:shadow-lg">
              <Image
                src={postView.hero}
                alt={postView.title}
                width={900}
                height={520}
                className="h-full w-full object-cover"
                preload
                unoptimized={postView.hero.startsWith("/api/files/")}
              />
            </div>
          </div>
        </header>

        {isRawHtmlPost ? (
          <>
            {/* 原始 HTML 文章：內容階段採 viewport gutter 寬版外框，不建立固定側欄，
                讓 iframe 取得接近 layout viewport 的可用寬度（見 RawHtmlPostFrame 內部的
                系統目錄 section-shell + 寬版 iframe 分層）。 */}
            <RawHtmlPostFrame
              html={contentHtml}
              tocItems={tocItems}
              showRawHtmlToc={postView.showRawHtmlToc}
            />

            {/* 站台附屬模組（分享、標籤）移到 iframe 後方，改用標準 section-shell，
                不再與 iframe 爭用橫向空間。 */}
            <section className="section-shell space-y-6">
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card dark:bg-base-100">
                <h3 className="mb-3 font-semibold text-primary">分享此文</h3>
                <ShareButtons url={postUrl} title={postView.title} />
              </div>

              <div className="rounded-2xl border border-line bg-white p-6 shadow-card dark:bg-base-100">
                <h3 className="font-semibold text-primary">標籤</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {postView.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/tag/${encodeURIComponent(tag)}`}
                      className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary/40"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            {/* 探索模組（搜尋／訂閱／熱門／最新）：寬版 iframe 之後以站台控制的
                responsive grid 呈現，不進入雙欄容器、不限縮 iframe 寬度（design.md D1）。 */}
            <StreamedPostDiscoveryPanel variant="grid" />
          </>
        ) : (
          <section className="section-shell grid gap-12 lg:grid-cols-[1fr_280px]">
            <div className="wysiwyg rounded-3xl border border-line bg-white p-8 shadow-card dark:bg-base-100">
              {/* 內嵌目錄索引區塊（唯一 ToC：導覽 + active section 高亮） */}
              <InlineToc items={tocItems} />
              {/* 文章內容 */}
              <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
            </div>
            <aside className="space-y-6">
              {/* 探索模組（搜尋／訂閱／熱門／最新）：桌面版右側欄主要內容，
                  sticky 避開站台 header（design.md D1）；窄螢幕改由下方的
                  stacked 版面顯示，此處只在 lg 以上斷點呈現。 */}
              <StreamedPostDiscoveryPanel variant="sidebar" />

              {/* 分享按鈕 */}
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card dark:bg-base-100">
                <h3 className="mb-3 font-semibold text-primary">分享此文</h3>
                <ShareButtons url={postUrl} title={postView.title} />
              </div>

              {/* 標籤 */}
              <div className="rounded-2xl border border-line bg-white p-6 shadow-card dark:bg-base-100">
                <h3 className="font-semibold text-primary">標籤</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {postView.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={`/tag/${encodeURIComponent(tag)}`}
                      className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary/40"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </section>
        )}

        {!isRawHtmlPost && (
          // 窄螢幕（lg 以下）：探索模組移至文章內容後方、延伸閱讀之前，只在 lg 以下顯示。
          <StreamedPostDiscoveryPanel variant="stacked" />
        )}

        {related.length > 0 && (
          <section className="section-shell space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-primary">延伸閱讀</h2>
              <Link 
                href="/blog" 
                className="inline-flex items-center gap-1.5 rounded-full border border-accent-600/30 bg-accent-600/5 px-4 py-2 text-sm font-semibold text-accent-600 transition hover:border-accent-600 hover:bg-accent-600 hover:text-white dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:border-amber-500 dark:hover:bg-amber-500 dark:hover:text-stone-900"
              >
                查看全部
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <PostCard key={item.slug} post={item} />
              ))}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

export async function generateMetadata({ params }: PostPageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const post = await postsQueries.getPostBySlug(slug);
  if (!post || post.status !== "PUBLISHED") {
    return { title: "文章不存在" };
  }
  const postView = toFrontendPost(post);

  // 取得站點名稱
  let siteName = "Lin Blog";
  try {
    const settings = await siteSettingsQueries.getDefault();
    if (settings?.siteName) siteName = settings.siteName;
  } catch {
    // 使用預設值
  }
  
  const siteUrl = getSiteUrl();
  const postUrl = `${siteUrl}/blog/${postView.slug}`;
  const title = postView.seo.title;
  const description = postView.seo.description;
  const image = postView.seo.ogImage || `${siteUrl}/og-default.jpg`;

  return {
    title: `${title} | ${siteName}`,
    description,
    openGraph: {
      title,
      description,
      url: postUrl,
      type: "article",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

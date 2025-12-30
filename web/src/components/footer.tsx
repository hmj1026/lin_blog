import Link from "next/link";
import { Logo } from "./logo";
import { SocialLinks } from "./social-links";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";
import type { SiteSettingRecord } from "@/modules/site-settings";

export async function Footer() {
  let quickLinks: Array<{ label: string; href: string }> = [
    { label: "部落格", href: "/blog" },
    { label: "分類：策略", href: "/category/策略" },
    { label: "分類：設計", href: "/category/設計" },
    { label: "分類：社群", href: "/category/社群" },
  ];

  // 動態值預設
  let siteName = "Lin Blog";
  let siteTagline = "內容．社群．設計";
  let siteDescription = "分享以社群為中心的內容策略、設計實務與 Newsletter 心法，讓每一篇文章都能啟動對話與行動。";
  let contactEmail = "hello@lin.blog";
  let copyrightText = "以內容連結社群";
  let settings: SiteSettingRecord | null = null;

  try {
    const [fetchedSettings, categories] = await Promise.all([
      siteSettingsUseCases.getDefault(),
      postsUseCases.listActiveCategories({ showInNav: true }),
    ]);

    settings = fetchedSettings;

    // 使用資料庫設定或預設值
    if (settings) {
      siteName = settings.siteName || siteName;
      siteTagline = settings.siteTagline || siteTagline;
      siteDescription = settings.siteDescription || siteDescription;
      contactEmail = settings.contactEmail || contactEmail;
      copyrightText = settings.copyrightText || copyrightText;
    }

    const links: Array<{ label: string; href: string }> = [];
    if (settings?.showBlogLink ?? true) links.push({ label: "部落格", href: "/blog" });
    links.push(
      ...categories.map((c) => ({
        label: `分類：${c.name}`,
        href: `/category/${encodeURIComponent(c.slug)}`,
      }))
    );
    if (links.length) quickLinks = links;
  } catch {
    // fall back to defaults
  }

  return (
    <footer className="mt-20 border-t border-line bg-white/90 backdrop-blur dark:bg-base-100">
      <div className="section-shell grid gap-12 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo siteName={siteName} tagline={siteTagline} />
          <p className="text-sm text-base-300 dark:text-base-600">
            {siteDescription}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-primary">快速導覽</h3>
          <div className="mt-4 grid gap-2 text-sm text-base-300 dark:text-base-600">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href as never} className="hover:text-primary">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div id="footer-contact" className="space-y-4">
          <h3 className="text-sm font-semibold text-primary">合作與諮詢</h3>
          <p className="text-sm text-base-300 dark:text-base-600">
            需要內容策略、設計審視或社群企劃？歡迎透過以下方式聯繫我。
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`mailto:${contactEmail}`}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-brand/40"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {contactEmail}
            </Link>
            {/* 社群連結按鈕 */}
            <SocialLinks settings={settings} />
          </div>
        </div>
      </div>
      <div className="border-t border-line/70 py-4 text-center text-xs text-base-300 dark:text-base-600">
        <span suppressHydrationWarning>
          © {new Date().getFullYear()} {siteName} — {copyrightText}。
        </span>
      </div>
    </footer>
  );
}

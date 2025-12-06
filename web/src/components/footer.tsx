import Link from "next/link";
import { Logo } from "./logo";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";

export async function Footer() {
  let quickLinks: Array<{ label: string; href: string }> = [
    { label: "部落格", href: "/blog" },
    { label: "分類：策略", href: "/category/策略" },
    { label: "分類：設計", href: "/category/設計" },
    { label: "分類：社群", href: "/category/社群" },
  ];

  try {
    const [settings, categories] = await Promise.all([
      siteSettingsUseCases.getDefault(),
      postsUseCases.listActiveCategories({ showInNav: true }),
    ]);

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
          <Logo />
          <p className="text-sm text-base-300 dark:text-base-600">
            分享以社群為中心的內容策略、設計實務與 Newsletter 心法，讓每一篇文章都能啟動對話與行動。
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
        <div id="footer-contact" className="space-y-3">
          <h3 className="text-sm font-semibold text-primary">合作與諮詢</h3>
          <p className="text-sm text-base-300 dark:text-base-600">
            需要內容策略、設計審視或社群企劃？留下訊息，我會在兩個工作日內回覆。
          </p>
          <Link
            href="mailto:hello@lin.blog"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5"
          >
            hello@lin.blog
          </Link>
        </div>
      </div>
      <div className="border-t border-line/70 py-4 text-center text-xs text-base-300 dark:text-base-600">
        <span suppressHydrationWarning>
          © {new Date().getFullYear()} Lin Blog — 以內容連結社群。
        </span>
      </div>
    </footer>
  );
}

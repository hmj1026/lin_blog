import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { getSiteUrl } from "@/lib/utils/url";

export async function GET() {
  // 站點設定預設值
  let siteName = "Lin Blog";
  let siteDescription = "策略 × 設計 × 社群 - 精選以社群為核心的內容策略、設計實務與營運心法";
  
  // 嘗試從資料庫讀取站點設定
  try {
    const settings = await siteSettingsUseCases.getDefault();
    if (settings) {
      siteName = settings.siteName || siteName;
      siteDescription = settings.siteDescription || siteDescription;
    }
  } catch {
    // 使用預設值
  }
  
  const posts = await postsUseCases.listPublishedPosts({ take: 20 });
  const siteUrl = getSiteUrl();
  const now = new Date().toUTCString();

  const rssItems = posts
    .map((post) => {
      const pubDate = post.publishedAt
        ? new Date(post.publishedAt).toUTCString()
        : new Date(post.createdAt).toUTCString();
      const link = `${siteUrl}/blog/${post.slug}`;
      const category = post.categories[0]?.name || "";

      return `
    <item>
      <title><![CDATA[${escapeXml(post.title)}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${escapeXml(post.excerpt)}]]></description>
      <pubDate>${pubDate}</pubDate>
      ${category ? `<category><![CDATA[${escapeXml(category)}]]></category>` : ""}
      ${post.author?.name ? `<author>${escapeXml(post.author.name)}</author>` : ""}
    </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteName}</title>
    <link>${siteUrl}</link>
    <description>${siteDescription}</description>
    <language>zh-TW</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml"/>
    ${rssItems}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

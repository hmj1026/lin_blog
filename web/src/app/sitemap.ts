import { MetadataRoute } from "next";
import { publicEnv } from "@/env.public";
import { postsQueries } from "@/lib/server-queries";
import { logger } from "@/lib/logger";

// DB-backed metadata route：比照專案「DB-backed 頁面不在 build 連 DB」慣例改為請求時
// 產生，避免 build 時被靜態化（docker build 期間 DB 不可達）而把僅含基本頁面的清單
// 固化進產物、導致所有文章頁永久缺席 sitemap。
export const dynamic = "force-dynamic";

/**
 * 解析 sitemap 用的 canonical base URL。
 *
 * production 不得落到 `https://example.com` placeholder；缺少 `NEXT_PUBLIC_SITE_URL`
 * 屬部署設定錯誤（deployment contract 應於部署驗證擋下），此處記錄穩定 misconfig
 * 事件碼（不 5xx、不洩漏值）並回退 placeholder，避免 sitemap 生成失敗。
 */
function resolveBaseUrl(): string {
  const configured = publicEnv.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;

  if (publicEnv.NEXT_PUBLIC_APP_ENV === "production" || publicEnv.NODE_ENV === "production") {
    logger.error("sitemap.base_url.misconfigured", { code: "SITE_URL_MISSING" });
  }
  return "https://example.com";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = resolveBaseUrl();
  const base: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${baseUrl}/blog`, priority: 0.9, changeFrequency: "weekly" },
  ];

  try {
    const posts = await postsQueries.listPublishedForSitemap();
    return [
      ...base,
      ...posts.map((post) => ({
        url: `${baseUrl}/blog/${post.slug}`,
        lastModified: (post.publishedAt ?? post.updatedAt).toISOString(),
        priority: 0.8,
        changeFrequency: "monthly" as const,
      })),
    ];
  } catch {
    // 安全的顯式錯誤記錄：穩定事件碼 + 穩定 code，不輸出 raw error/stack/DSN/文章內容。
    // 維持 base fallback 以免 sitemap 回應 5xx；crawler retry 造成的 log spam 由既有
    // logger/observability 層以 rate limit 或等效抑制處理（見 docs/operations）。
    logger.error("sitemap.generate.error", { code: "POST_QUERY_FAILED" });
    return base;
  }
}

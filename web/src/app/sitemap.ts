import { MetadataRoute } from "next";
import { publicEnv } from "@/env.public";
import { postsUseCases } from "@/modules/posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = publicEnv.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const base: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, priority: 1, changeFrequency: "weekly" },
    { url: `${baseUrl}/blog`, priority: 0.9, changeFrequency: "weekly" },
  ];

  try {
    const posts = await postsUseCases.listPublishedForSitemap();
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
    return base;
  }
}

import { requirePermission } from "@/lib/api-utils";
import { NextRequest } from "next/server";
import { postsQueries } from "@/lib/server-queries";
import { packZip, type ArchivePost } from "@/lib/posts/markdown-archive";

/**
 * GET /api/posts/export - 匯出文章為 JSON
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requirePermission("posts:write");
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  const posts = await postsQueries.exportPosts({ ids: ids.length ? ids : undefined });
  const exportData = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: p.coverImage,
    readingTime: p.readingTime,
    featured: p.featured,
    allowRawHtml: p.allowRawHtml,
    showRawHtmlToc: p.showRawHtmlToc,
    status: p.status,
    publishedAt: p.publishedAt?.toISOString() || null,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    ogImage: p.ogImage,
    categories: p.categories.map((c) => c.slug),
    tags: p.tags.map((t) => t.slug),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  if (format === "json") {
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="posts-export-${Date.now()}.json"`,
      },
    });
  }

  // Markdown 格式：每篇一個 .md（含 JSON frontmatter）打包成 ZIP，符合可再匯入的 round-trip 契約。
  const archivePosts: ArchivePost[] = exportData.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    status: p.status,
    featured: p.featured,
    allowRawHtml: p.allowRawHtml,
    showRawHtmlToc: p.showRawHtmlToc,
    publishedAt: p.publishedAt,
    coverImage: p.coverImage,
    readingTime: p.readingTime,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    ogImage: p.ogImage,
    categories: p.categories,
    tags: p.tags,
  }));

  const zip = await packZip(archivePosts);

  return new Response(zip, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="posts-export-${Date.now()}.zip"`,
    },
  });
}

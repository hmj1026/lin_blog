import { requirePermission } from "@/lib/api-utils";
import { NextRequest } from "next/server";
import { postsUseCases } from "@/modules/posts";

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

  const posts = await postsUseCases.exportPosts({ ids: ids.length ? ids : undefined });
  const exportData = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: p.coverImage,
    readingTime: p.readingTime,
    featured: p.featured,
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

  // Markdown 格式（簡化實作）
  const markdown = exportData.map((p) => {
    const frontmatter = [
      "---",
      `title: "${p.title}"`,
      `slug: "${p.slug}"`,
      `excerpt: "${p.excerpt}"`,
      `status: "${p.status}"`,
      `featured: ${p.featured}`,
      p.publishedAt ? `publishedAt: "${p.publishedAt}"` : null,
      p.categories.length ? `categories: [${p.categories.join(", ")}]` : null,
      p.tags.length ? `tags: [${p.tags.join(", ")}]` : null,
      "---",
    ]
      .filter(Boolean)
      .join("\n");
    return `${frontmatter}\n\n${p.content}`;
  }).join("\n\n---\n\n");

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="posts-export-${Date.now()}.md"`,
    },
  });
}

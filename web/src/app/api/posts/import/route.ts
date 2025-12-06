import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";

type ImportPost = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage?: string | null;
  readingTime?: string | null;
  featured?: boolean;
  status?: string;
  publishedAt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  categories?: string[];
  tags?: string[];
};

/**
 * POST /api/posts/import - 匯入文章
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requirePermission("posts:write");
  if (authError) return authError;

  try {
    const body = await request.json();
    const { posts, mode = "skip" } = body as {
      posts: ImportPost[];
      mode?: "skip" | "overwrite";
    };

    if (!Array.isArray(posts) || posts.length === 0) {
      return jsonError("請提供要匯入的文章", 400);
    }

    const results = await postsUseCases.importPosts({ posts, mode });

    return jsonOk({
      message: `匯入完成：${results.created} 新增，${results.updated} 更新，${results.skipped} 略過`,
      ...results,
    });
  } catch {
    return jsonError("匯入失敗：無效的 JSON 格式", 400);
  }
}

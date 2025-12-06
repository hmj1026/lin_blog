import { jsonOk } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return jsonOk([]);
  }

  const posts = await postsUseCases.searchPosts({ query, take: 20 });

  // 回傳精簡的搜尋結果
  const results = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    category: post.categories[0]?.name ?? null,
  }));

  return jsonOk(results);
}

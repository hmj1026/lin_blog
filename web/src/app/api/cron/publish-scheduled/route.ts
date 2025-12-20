import { postsUseCases } from "@/modules/posts";
import { NextRequest } from "next/server";

/**
 * 排程發佈檢查 API
 * 可透過 Vercel Cron Jobs 或外部服務定期呼叫
 * 檢查所有 SCHEDULED 狀態且 publishedAt <= 現在的文章，將其發佈
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 驗證 cron secret（防止未授權呼叫）
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  const { count, published } = await postsUseCases.publishScheduledPosts(now);
  if (count === 0) {
    return Response.json({
      success: true,
      message: "No scheduled posts to publish",
      published: [],
    });
  }

  return Response.json({
    success: true,
    message: `Published ${count} scheduled posts`,
    published: published.map((p) => ({
      id: p.id,
      slug: p.slug,
      scheduledAt: p.publishedAt,
    })),
  });
}

// 也支援 POST 方法（某些 cron 服務使用 POST）
export async function POST(request: NextRequest) {
  return GET(request);
}

import { postsUseCases } from "@/modules/posts";
import { auditUseCases } from "@/modules/audit";
import { NextRequest } from "next/server";
import { env } from "@/env";
import { logger } from "@/lib/logger";

/**
 * 排程發佈檢查 API
 * 可透過 Vercel Cron Jobs 或外部服務定期呼叫
 * 檢查所有 SCHEDULED 狀態且 publishedAt <= 現在的文章，將其發佈
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // 驗證 cron secret（防止未授權呼叫）
  const authHeader = request.headers.get("authorization");
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET is not configured; rejecting cron request (fail-closed)");
    return new Response("Server misconfiguration", { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // 稽核保留清理與事件寫入解耦：每次排程執行都獨立清除逾期事件，
  // 即使長期無高風險 mutation 或事件寫入失敗，保留政策仍會生效。失敗不影響排程主流程。
  try {
    await auditUseCases.purgeExpiredAuditEvents(now);
  } catch {
    logger.warn("Audit retention cleanup failed", { retentionDays: 365 });
  }

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

import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";

/**
 * 批次更新文章狀態 API
 * POST /api/posts/batch
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authError = await requirePermission("posts:write");
    if (authError) return authError;

    const body = await request.json();
    const { action, postIds } = body as {
      action: "publish" | "draft" | "delete";
      postIds: string[];
    };

    if (!action || !postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return Response.json({ success: false, message: "缺少 action 或 postIds" }, { status: 400 });
    }

    let result;

    switch (action) {
      case "publish":
        result = await postsUseCases.batchPostAction({ action, postIds });
        break;

      case "draft":
        result = await postsUseCases.batchPostAction({ action, postIds });
        break;

      case "delete":
        result = await postsUseCases.batchPostAction({ action, postIds });
        break;

      default:
        return Response.json({ success: false, message: "不支援的操作" }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: `已${action === "publish" ? "發佈" : action === "draft" ? "設為草稿" : "刪除"} ${result.count} 篇文章`,
      count: result.count,
    });
  } catch (error) {
    console.error("Batch operation error:", error);
    return Response.json({ success: false, message: "操作失敗" }, { status: 500 });
  }
}

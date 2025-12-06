import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { getSession } from "@/lib/auth";
import { postsUseCases } from "@/modules/posts";

type RouteContext = { params: Promise<{ id: string; versionId: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/[id]/versions/[versionId] - 取得版本詳情
 */
export async function GET(request: Request, context: RouteContext) {
  const authError = await requirePermission("posts:write");
  if (authError) return authError;

  const { id, versionId } = await context.params;

  const version = await postsUseCases.getPostVersion(id, versionId);
  if (!version) return jsonError("版本不存在", 404);

  return jsonOk({
    id: version.id,
    title: version.title,
    excerpt: version.excerpt,
    content: version.content,
    editorName: version.editor?.name || version.editor?.email || "Unknown",
    createdAt: version.createdAt.toISOString(),
  });
}

/**
 * POST /api/posts/[id]/versions/[versionId]/restore - 還原到指定版本
 */
export async function POST(request: Request, context: RouteContext) {
  const authError = await requirePermission("posts:write");
  if (authError) return authError;

  const session = await getSession();
  const { id, versionId } = await context.params;

  const restored = await postsUseCases.restorePostVersion(id, versionId, session?.user?.id ?? null);
  if (!restored.ok) {
    return jsonError(restored.error === "post-not-found" ? "文章不存在" : "版本不存在", 404);
  }

  return jsonOk({ message: "已還原到選定版本" });
}

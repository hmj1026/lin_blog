import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { postsUseCases } from "@/modules/posts";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/**
 * GET /api/posts/[id]/versions - 取得文章版本列表
 */
export async function GET(request: Request, context: RouteContext) {
  const authError = await requirePermission("posts:write");
  if (authError) return authError;

  const { id } = await context.params;

  const result = await postsUseCases.listPostVersions(id);
  if (!result) return jsonError("文章不存在", 404);
  const { versions } = result;

  return jsonOk(
    versions.map((v) => ({
      id: v.id,
      title: v.title,
      excerptPreview: v.excerpt.slice(0, 100),
      editorName: v.editor?.name || v.editor?.email || "Unknown",
      createdAt: v.createdAt.toISOString(),
    }))
  );
}

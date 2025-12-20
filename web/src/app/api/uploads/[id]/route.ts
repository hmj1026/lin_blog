import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { mediaUseCases } from "@/modules/media";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/**
 * DELETE /api/uploads/[id] - 刪除檔案（軟刪除）
 */
export async function DELETE(request: Request, context: RouteContext) {
  const authError = await requirePermission("uploads:write");
  if (authError) return authError;

  const { id } = await context.params;

  const deleted = await mediaUseCases.softDeleteUpload(id);
  if (!deleted.ok) return jsonError("檔案不存在", 404);

  return jsonOk({ message: "檔案已刪除" });
}

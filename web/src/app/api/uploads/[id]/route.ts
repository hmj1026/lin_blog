import { jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { mediaUseCases } from "@/modules/media";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

/** GET /api/uploads/[id] - 取得刪除前的結構化引用摘要。 */
export async function GET(_request: Request, context: RouteContext) {
  const authError = await requirePermission("uploads:write");
  if (authError) return authError;

  const { id } = await context.params;
  const impact = await mediaUseCases.getUploadDeletionImpact(id);
  if (!impact.ok) return jsonError("檔案不存在", 404);
  return jsonOk(impact);
}

/**
 * DELETE /api/uploads/[id] - 刪除檔案（軟刪除）
 */
export async function DELETE(request: Request, context: RouteContext) {
  const authError = await requirePermission("uploads:write");
  if (authError) return authError;

  const { id } = await context.params;

  const deleted = await mediaUseCases.softDeleteUpload(id);
  if (!deleted.ok && deleted.error === "referenced") {
    return jsonError(`檔案仍被引用：${deleted.references.map((reference) => reference.label).join("、")}`, 409);
  }
  if (!deleted.ok && deleted.error === "conflict") {
    return jsonError("刪除發生並行衝突，請重試", 409);
  }
  if (!deleted.ok) return jsonError("檔案不存在", 404);

  await recordAuditEventSafely({ action: "media.deleted", resourceType: "upload", resourceId: id, summary: {} });
  return jsonOk({ message: "檔案已刪除" });
}

import { handleApiError, jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validations/category.schema";
import { postsUseCases } from "@/modules/posts";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const authError = await requirePermission("categories:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    return jsonOk(await postsUseCases.getCategoryDeletionImpact(id));
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, context: Context) {
  const authError = await requirePermission("categories:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const raw = await request.json();
    const parsed = categorySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "輸入驗證失敗");
    }
    const updated = await postsUseCases.updateCategory(id, parsed.data);
    return jsonOk(updated);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const authError = await requirePermission("categories:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const removed = await postsUseCases.removeCategory(id);
    await recordAuditEventSafely({ action: "category.deleted", resourceType: "category", resourceId: id, summary: {} });
    return jsonOk(removed);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const authError = await requirePermission("categories:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const text = await request.text();
    let raw: { mergeIntoId?: unknown };
    try {
      raw = text ? JSON.parse(text) as { mergeIntoId?: unknown } : {};
    } catch {
      return jsonError("請求內容不是有效的 JSON", 400);
    }
    // 明確區分合併與復原：出現 mergeIntoId 鍵但格式不對時直接拒絕，避免誤觸復原。
    if ("mergeIntoId" in raw) {
      if (typeof raw.mergeIntoId !== "string" || !raw.mergeIntoId.trim()) {
        return jsonError("mergeIntoId 必須為非空字串", 400);
      }
      const targetId = raw.mergeIntoId.trim();
      const result = await postsUseCases.mergeCategory(id, targetId);
      await recordAuditEventSafely({ action: "category.merged", resourceType: "category", resourceId: id, summary: { affectedCount: result.movedPosts, referenceIds: [targetId] } });
      return jsonOk(result);
    }
    return jsonOk(await postsUseCases.restoreCategory(id));
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

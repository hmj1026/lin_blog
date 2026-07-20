import { handleApiError, jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validations/category.schema";
import { postsUseCases } from "@/modules/posts";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";
import { handleTaxonomyPatch } from "@/lib/server/taxonomy-patch";

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
  return handleTaxonomyPatch(request, context, {
    permission: "categories:manage",
    resourceType: "category",
    merge: (id, targetId) => postsUseCases.mergeCategory(id, targetId),
    restore: (id) => postsUseCases.restoreCategory(id),
  });
}

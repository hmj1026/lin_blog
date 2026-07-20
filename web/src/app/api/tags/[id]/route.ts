import { handleApiError, jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { tagSchema } from "@/lib/validations/tag.schema";
import { postsUseCases } from "@/modules/posts";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";
import { handleTaxonomyPatch } from "@/lib/server/taxonomy-patch";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const authError = await requirePermission("tags:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const raw = await request.json();
    const parsed = tagSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(parsed.error.errors[0]?.message ?? "輸入驗證失敗");
    }
    const updated = await postsUseCases.updateTag(id, parsed.data);
    return jsonOk(updated);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const authError = await requirePermission("tags:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const removed = await postsUseCases.removeTag(id);
    await recordAuditEventSafely({ action: "tag.deleted", resourceType: "tag", resourceId: id, summary: {} });
    return jsonOk(removed);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  return handleTaxonomyPatch(request, context, {
    permission: "tags:manage",
    resourceType: "tag",
    merge: (id, targetId) => postsUseCases.mergeTag(id, targetId),
    restore: (id) => postsUseCases.restoreTag(id),
  });
}

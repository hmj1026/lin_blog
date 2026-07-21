import { handleApiError, jsonOk, jsonError, requirePermission } from "@/lib/api-utils";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

type Context = { params: Promise<{ id: string }> };

type TaxonomyPatchConfig = {
  /** 該分類法所需的管理權限鍵（categories:manage / tags:manage）。 */
  permission: string;
  /** 稽核記錄與 action 前綴用的資源類型（category / tag）。 */
  resourceType: string;
  /** 合併：把 source 併入 target，回傳含 movedPosts 的結果。 */
  merge: (id: string, targetId: string) => Promise<{ movedPosts: number }>;
  /** 復原軟刪除項目。 */
  restore: (id: string) => Promise<unknown>;
};

/**
 * categories/tags PATCH 的共用 merge/restore 處理。
 *
 * 兩條路由的合併／復原流程完全相同，僅權限鍵、use-case 方法與稽核 resourceType 不同，
 * 以 config 參數化避免重複。出現 `mergeIntoId` 鍵但格式不對時直接拒絕，避免誤觸復原。
 */
export async function handleTaxonomyPatch(request: Request, context: Context, config: TaxonomyPatchConfig) {
  const authError = await requirePermission(config.permission);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const text = await request.text();
    let raw: { mergeIntoId?: unknown };
    try {
      raw = text ? (JSON.parse(text) as { mergeIntoId?: unknown }) : {};
    } catch {
      return jsonError("請求內容不是有效的 JSON", 400);
    }
    if ("mergeIntoId" in raw) {
      if (typeof raw.mergeIntoId !== "string" || !raw.mergeIntoId.trim()) {
        return jsonError("mergeIntoId 必須為非空字串", 400);
      }
      const targetId = raw.mergeIntoId.trim();
      const result = await config.merge(id, targetId);
      await recordAuditEventSafely({ action: `${config.resourceType}.merged`, resourceType: config.resourceType, resourceId: id, summary: { affectedCount: result.movedPosts, referenceIds: [targetId] } });
      return jsonOk(result);
    }
    const restored = await config.restore(id);
    await recordAuditEventSafely({ action: `${config.resourceType}.restored`, resourceType: config.resourceType, resourceId: id, summary: {} });
    return jsonOk(restored);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

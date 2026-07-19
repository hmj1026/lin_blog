import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { siteSettingsQueries } from "@/lib/server-queries";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { recordAuditEventSafely, changedFieldNames } from "@/lib/server/audit-safe";

export async function GET() {
  const settings = await siteSettingsQueries.getOrCreateDefault();
  return jsonOk(settings);
}

export async function PUT(request: Request) {
  const authError = await requirePermission("settings:manage");
  if (authError) return authError;

  try {
    const data = await request.json();
    const updated = await siteSettingsUseCases.updateDefault(data);
    // partial payload 僅含實際變動的欄位，記錄其欄位名讓稽核可辨識修改範圍（僅欄位名，不含值）。
    await recordAuditEventSafely({ action: "settings.updated", resourceType: "site-settings", resourceId: "default", summary: { changedFields: changedFieldNames(data) } });
    return jsonOk(updated);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

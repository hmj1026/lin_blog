import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { recordAuditEventSafely, changedFieldNames } from "@/lib/server/audit-safe";

export async function PUT(request: Request) {
  const authError = await requirePermission("settings:manage");
  if (authError) return authError;

  try {
    const data = await request.json();
    const updated = await siteSettingsUseCases.updateAboutContent(data);
    await recordAuditEventSafely({ action: "settings.about_updated", resourceType: "site-settings", resourceId: "default", summary: { changedFields: changedFieldNames(data) } });
    return jsonOk(updated);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

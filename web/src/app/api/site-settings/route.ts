import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { siteSettingsQueries } from "@/lib/server-queries";
import { siteSettingsUseCases } from "@/modules/site-settings";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

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
    await recordAuditEventSafely({ action: "settings.updated", resourceType: "site-settings", resourceId: "default", summary: { changedFields: ["metadata"] } });
    return jsonOk(updated);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

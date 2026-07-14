import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { siteSettingsUseCases } from "@/modules/site-settings";

export async function PUT(request: Request) {
  const authError = await requirePermission("settings:manage");
  if (authError) return authError;

  try {
    const data = await request.json();
    const updated = await siteSettingsUseCases.updateAboutContent(data);
    return jsonOk(updated);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

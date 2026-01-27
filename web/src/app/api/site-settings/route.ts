import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { siteSettingsQueries } from "@/lib/server-queries";
import { siteSettingsUseCases } from "@/modules/site-settings";

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
    return jsonOk(updated);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

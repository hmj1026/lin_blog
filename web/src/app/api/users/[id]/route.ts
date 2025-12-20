import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { securityAdminUseCases } from "@/modules/security-admin";
import { toUserAdminRowDto } from "@/modules/security-admin/presentation/dto";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: Context) {
  const authError = await requirePermission("users:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const user = await securityAdminUseCases.updateUser(id, await request.json());
    return jsonOk(toUserAdminRowDto(user));
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const authError = await requirePermission("users:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const user = await securityAdminUseCases.softDeleteUser(id);
    return jsonOk(toUserAdminRowDto(user));
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

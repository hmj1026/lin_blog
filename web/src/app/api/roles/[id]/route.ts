import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { securityAdminUseCases } from "@/modules/security-admin";
import { toRoleDto } from "@/modules/security-admin/presentation/dto";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: Context) {
  const authError = await requirePermission("roles:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const role = await securityAdminUseCases.updateRole(id, await request.json());
    return jsonOk(toRoleDto(role));
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const authError = await requirePermission("roles:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const role = await securityAdminUseCases.softDeleteRole(id);
    return jsonOk({ id: role.id, ok: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

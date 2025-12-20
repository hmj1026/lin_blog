import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { securityAdminUseCases } from "@/modules/security-admin";
import { toPermissionDto, toRoleDto } from "@/modules/security-admin/presentation/dto";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requirePermission("roles:manage");
  if (authError) return authError;

  const { roles, permissions } = await securityAdminUseCases.listRolesAndPermissions();

  return jsonOk({
    permissions: permissions.map(toPermissionDto),
    roles: roles.map(toRoleDto),
  });
}

export async function POST(request: Request) {
  const authError = await requirePermission("roles:manage");
  if (authError) return authError;

  try {
    const role = await securityAdminUseCases.createRole(await request.json());
    return jsonOk(toRoleDto(role));
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { securityAdminUseCases } from "@/modules/security-admin";
import { securityAdminQueries } from "@/lib/server-queries";
import { toPermissionDto, toRoleDto } from "@/modules/security-admin/presentation/dto";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requirePermission("roles:manage");
  if (authError) return authError;

  const { roles, permissions } = await securityAdminQueries.listRolesAndPermissions();

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
    await recordAuditEventSafely({ action: "role.created", resourceType: "role", resourceId: role.id, summary: { affectedCount: role.permissionKeys?.length ?? 0 } });
    return jsonOk(toRoleDto(role));
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

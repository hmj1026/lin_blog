import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { securityAdminUseCases } from "@/modules/security-admin";
import { toRoleDto } from "@/modules/security-admin/presentation/dto";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: Context) {
  const authError = await requirePermission("roles:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const payload = await request.json() as { name?: unknown; permissionKeys?: string[] };
    // 先取更新前權限快照，才能只在權限實際變動時記錄 "permissions"，而非無條件宣稱。
    const beforePermissions = new Set(await securityAdminUseCases.listRolePermissions(id));
    const role = await securityAdminUseCases.updateRole(id, payload);
    // 以去重集合比對，避免重複的 permissionKeys（如 ["a","a"]）在集合相同時誤記 permissions 變更。
    const nextPermissions = new Set(payload.permissionKeys ?? role.permissionKeys ?? []);
    const permissionsChanged =
      nextPermissions.size !== beforePermissions.size ||
      [...nextPermissions].some((key) => !beforePermissions.has(key));
    const changedFields = [
      ...(typeof payload.name === "string" ? ["name"] : []),
      ...(permissionsChanged ? ["permissions"] : []),
    ];
    await recordAuditEventSafely({
      action: "role.updated",
      resourceType: "role",
      resourceId: id,
      summary: { changedFields, affectedCount: nextPermissions.size },
    });
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
    await recordAuditEventSafely({ action: "role.deleted", resourceType: "role", resourceId: id, summary: {} });
    return jsonOk({ id: role.id, ok: true });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

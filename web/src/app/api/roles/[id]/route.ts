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
    const payload = await request.json() as { key?: unknown; name?: unknown; permissionKeys?: string[] };
    // 先取更新前 key/name/權限快照，才能只在欄位實際變動時記錄，而非無條件宣稱。
    const before = await securityAdminUseCases.getRoleAuditState(id);
    const beforePermissions = new Set(before?.permissionKeys ?? []);
    const role = await securityAdminUseCases.updateRole(id, payload);
    // 以去重集合比對，避免重複的 permissionKeys（如 ["a","a"]）在集合相同時誤記 permissions 變更。
    const nextPermissions = new Set(payload.permissionKeys ?? role.permissionKeys ?? []);
    const permissionsChanged =
      nextPermissions.size !== beforePermissions.size ||
      [...nextPermissions].some((key) => !beforePermissions.has(key));
    // key 為角色識別鍵，變更需可稽核；僅在與更新前不同時記錄。
    const keyChanged = typeof payload.key === "string" && payload.key !== before?.key;
    const nameChanged = typeof payload.name === "string" && payload.name !== before?.name;
    const changedFields = [
      ...(keyChanged ? ["key"] : []),
      ...(nameChanged ? ["name"] : []),
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

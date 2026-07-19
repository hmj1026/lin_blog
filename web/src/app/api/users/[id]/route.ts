import { handleApiError, jsonOk, requirePermission } from "@/lib/api-utils";
import { securityAdminUseCases } from "@/modules/security-admin";
import { toUserAdminRowDto } from "@/modules/security-admin/presentation/dto";
import { getSession } from "@/lib/auth";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

type Context = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: Context) {
  const authError = await requirePermission("users:manage");
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const payload = await request.json() as Record<string, unknown>;
    const previous = await securityAdminUseCases.getUserAuthSnapshot(id);
    const user = await securityAdminUseCases.updateUser(id, payload);
    // 與更新前快照實際比對，避免稽核永遠宣稱三個欄位皆變更；密碼重設只記錄事實、不記錄值。
    const changedFields = [
      ...("email" in payload && (!previous || user.email !== previous.email) ? ["email"] : []),
      ...("name" in payload && (!previous || (user.name ?? null) !== (previous.name ?? null)) ? ["name"] : []),
      ...("roleId" in payload && (!previous || user.roleId !== previous.roleId) ? ["roleId"] : []),
      ...(typeof payload.password === "string" && payload.password.length > 0 ? ["password"] : []),
    ];
    await recordAuditEventSafely({
      action: "user.updated",
      resourceType: "user",
      resourceId: id,
      summary: {
        changedFields,
        fromRoleId: previous?.roleId,
        toRoleId: user.roleId,
      },
    });
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
    const session = await getSession();
    const user = await securityAdminUseCases.softDeleteUser(id, { actorId: session?.user?.id });
    await recordAuditEventSafely({ action: "user.disabled", resourceType: "user", resourceId: id, summary: { fromStatus: "active", toStatus: "disabled" } });
    return jsonOk(toUserAdminRowDto(user));
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

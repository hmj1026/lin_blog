import { jsonOk, handleApiError, requirePermission } from "@/lib/api-utils";
import { securityAdminUseCases } from "@/modules/security-admin";
import { securityAdminQueries } from "@/lib/server-queries";
import { toUserAdminRowDto } from "@/modules/security-admin/presentation/dto";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requirePermission("users:manage");
  if (authError) return authError;

  const users = await securityAdminQueries.listUsers({ includeDeleted: false });
  return jsonOk(users.map(toUserAdminRowDto));
}

export async function POST(request: Request) {
  const authError = await requirePermission("users:manage");
  if (authError) return authError;

  try {
    const user = await securityAdminUseCases.createUser(await request.json());
    await recordAuditEventSafely({
      action: "user.created",
      resourceType: "user",
      resourceId: user.id,
      summary: { changedFields: ["email", "name", "roleId"] },
    });
    return jsonOk(toUserAdminRowDto(user), { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

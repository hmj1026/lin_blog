import { jsonOk, handleApiError, requirePermission } from "@/lib/api-utils";
import { securityAdminUseCases } from "@/modules/security-admin";
import { toUserAdminRowDto } from "@/modules/security-admin/presentation/dto";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requirePermission("users:manage");
  if (authError) return authError;

  const users = await securityAdminUseCases.listUsers({ includeDeleted: false });
  return jsonOk(users.map(toUserAdminRowDto));
}

export async function POST(request: Request) {
  const authError = await requirePermission("users:manage");
  if (authError) return authError;

  try {
    const user = await securityAdminUseCases.createUser(await request.json());
    return jsonOk(toUserAdminRowDto(user), { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

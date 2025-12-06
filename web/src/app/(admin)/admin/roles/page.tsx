import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { RoleAdminClient } from "@/components/admin/role-admin-client";
import { securityAdminUseCases } from "@/modules/security-admin";

export default async function AdminRolesPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "roles:manage"))) redirect("/admin");

  const { roles, permissions } = await securityAdminUseCases.listRolesAndPermissions();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-primary">角色權限</h1>
      <RoleAdminClient
        permissions={permissions.map((p) => ({ key: p.key, name: p.name }))}
        initialRoles={roles}
      />
    </div>
  );
}

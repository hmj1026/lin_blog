import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { RoleAdminClient } from "@/components/admin/role-admin-client";
import { securityAdminQueries } from "@/lib/server-queries";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export default async function AdminRolesPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!(await roleHasPermission(session.user.roleId, "roles:manage"))) return <AdminAccessDenied />;

  const { roles, permissions } = await securityAdminQueries.listRolesAndPermissions();

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

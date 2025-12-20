import { UserAdminClient } from "@/components/admin/user-admin-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { securityAdminUseCases } from "@/modules/security-admin";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "users:manage"))) redirect("/admin");

  const [users, roles] = await Promise.all([
    securityAdminUseCases.listUsers({ includeDeleted: true }),
    securityAdminUseCases.listActiveRoles(),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-primary">使用者管理</h1>
      <UserAdminClient
        roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name }))}
        initialUsers={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          roleId: u.roleId,
          roleKey: u.role.key,
          roleName: u.role.name,
          deletedAt: u.deletedAt ? u.deletedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}

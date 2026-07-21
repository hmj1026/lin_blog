import { UserAdminClient } from "@/components/admin/user-admin-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { securityAdminQueries } from "@/lib/server-queries";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!sessionHasPermission(session, "users:manage")) return <AdminAccessDenied />;

  const [users, roles] = await Promise.all([
    securityAdminQueries.listUsers({ includeDeleted: true }),
    securityAdminQueries.listActiveRoles(),
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

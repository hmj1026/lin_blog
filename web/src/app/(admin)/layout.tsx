import { AdminSidebar } from "@/components/admin/sidebar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const roleId = session.user.roleId;
  if (!roleId) redirect("/login");
  const canAccess = sessionHasPermission(session, "admin:access");
  if (!canAccess) redirect("/login");
  return (
    <div className="admin-layout flex min-h-screen bg-base-50">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

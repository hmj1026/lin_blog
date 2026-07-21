import { AdminSidebar } from "@/components/admin/sidebar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { siteSettingsQueries } from "@/lib/server-queries";
import { buildAdminNavigation } from "@/lib/admin-navigation";

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

  let showAbout = false;
  try {
    const settings = await siteSettingsQueries.getDefault();
    showAbout = settings?.showAbout ?? false;
  } catch {
    // 設定不可用時預設不顯示 About 入口
  }

  const navigationGroups = buildAdminNavigation({
    permissions: session.user.permissions ?? [],
    showAbout,
  });

  return (
    <div className="admin-layout flex min-h-screen bg-base-50">
      <AdminSidebar
        navigationGroups={navigationGroups}
        account={{
          email: session.user.email,
          roleName: session.user.roleName ?? "後台使用者",
        }}
      />
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

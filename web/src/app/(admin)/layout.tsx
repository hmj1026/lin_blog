import { AdminSidebar } from "@/components/admin/sidebar";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { siteSettingsQueries } from "@/lib/server-queries";

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

  return (
    <div className="admin-layout flex min-h-screen bg-base-50">
      <AdminSidebar showAbout={showAbout} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}

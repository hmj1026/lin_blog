import { siteSettingsQueries } from "@/lib/server-queries";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!(await roleHasPermission(session.user.roleId, "settings:manage"))) return <AdminAccessDenied />;

  const settings = await siteSettingsQueries.getOrCreateDefault();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-primary">站點設定</h1>
      <SiteSettingsForm initialSettings={settings} />
    </div>
  );
}

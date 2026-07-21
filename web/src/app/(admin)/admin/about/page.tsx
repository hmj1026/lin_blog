import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac";
import { siteSettingsQueries } from "@/lib/server-queries";
import { AboutEditorForm } from "@/components/admin/about-editor-form";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export const dynamic = "force-dynamic";

export default async function AdminAboutPage() {
  const session = await getSession();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const roleId = session.user.roleId;
  if (!roleId) return <AdminAccessDenied />;
  const canManage = await roleHasPermission(roleId, "settings:manage");
  if (!canManage) return <AdminAccessDenied />;

  const settings = await siteSettingsQueries.getOrCreateDefault();
  return (
    <AboutEditorForm
      initial={{
        aboutTitle: settings.aboutTitle,
        aboutContent: settings.aboutContent,
        aboutAllowRawHtml: settings.aboutAllowRawHtml,
        aboutShowRawHtmlToc: settings.aboutShowRawHtmlToc,
      }}
    />
  );
}

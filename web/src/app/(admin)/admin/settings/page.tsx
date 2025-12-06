import { siteSettingsUseCases } from "@/modules/site-settings";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { postsUseCases } from "@/modules/posts";

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "settings:manage"))) redirect("/admin");

  const [settings, categories] = await Promise.all([
    siteSettingsUseCases.getOrCreateDefault(),
    postsUseCases.listActiveCategories(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-primary">站點設定</h1>
      <SiteSettingsForm
        initialShowBlogLink={settings.showBlogLink}
        initialCategories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          showInNav: category.showInNav,
          navOrder: category.navOrder,
        }))}
      />
    </div>
  );
}

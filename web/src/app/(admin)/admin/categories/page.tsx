import { CategoryAdminClient } from "@/components/admin/category-admin-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { postsUseCases } from "@/modules/posts";

export default async function AdminCategoriesPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "categories:manage"))) redirect("/admin");

  const categories = await postsUseCases.listAllCategories();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-primary">分類管理</h1>
      <CategoryAdminClient
        initialCategories={categories.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          showInNav: c.showInNav,
          navOrder: c.navOrder,
          deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}

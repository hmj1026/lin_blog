import { TagAdminClient } from "@/components/admin/tag-admin-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { postsUseCases } from "@/modules/posts";

export default async function AdminTagsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "tags:manage"))) redirect("/admin");

  const tags = await postsUseCases.listAllTags();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-primary">標籤管理</h1>
      <TagAdminClient
        initialTags={tags.map((t) => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          deletedAt: t.deletedAt ? t.deletedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}

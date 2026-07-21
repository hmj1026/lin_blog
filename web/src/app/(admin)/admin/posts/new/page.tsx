import { AdminPostForm } from "@/components/admin/post-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { postsQueries } from "@/lib/server-queries";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export default async function AdminPostNewPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!(await roleHasPermission(session.user.roleId, "posts:write"))) return <AdminAccessDenied />;

  const [categories, tags] = await Promise.all([
    postsQueries.listActiveCategories(),
    postsQueries.listActiveTags(),
  ]);

  return (
    <AdminPostForm
      mode="create"
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      tags={tags.map((t) => ({ id: t.id, name: t.name }))}
      initial={{
        slug: "",
        title: "",
        excerpt: "",
        content: "<p></p>",
        coverImage: null,
        readingTime: null,
        featured: false,
        allowRawHtml: false,
        showRawHtmlToc: false,
        status: "DRAFT",
        publishedAt: "",
        categoryIds: [],
        tagIds: [],
        seoTitle: null,
        seoDescription: null,
        ogImage: null,
      }}
    />
  );
}

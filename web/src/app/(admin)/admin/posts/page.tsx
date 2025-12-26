import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { postsUseCases } from "@/modules/posts";
import { PostListClient } from "@/components/admin/post-list-client";

export default async function AdminPostsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "posts:write"))) redirect("/admin");

  const posts = await postsUseCases.listAdminPosts();

  // 轉換為 client 端格式
  const clientPosts = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    featured: p.featured,
    updatedAt: p.updatedAt.toISOString(),
    categories: p.categories.map((c) => ({ name: c.name })),
    tags: p.tags.map((t) => ({ name: t.name })),
  }));

  return <PostListClient posts={clientPosts} />;
}


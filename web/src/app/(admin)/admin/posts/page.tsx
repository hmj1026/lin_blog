import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { postsQueries } from "@/lib/server-queries";
import { PostListClient } from "@/components/admin/post-list-client";

export default async function AdminPostsPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!sessionHasPermission(session, "posts:write")) redirect("/admin");

  const posts = await postsQueries.listAdminPosts();

  // 轉換為 client 端格式
  const clientPosts = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    featured: p.featured,
    allowRawHtml: p.allowRawHtml,
    updatedAt: p.updatedAt.toISOString(),
    publishedAt: p.publishedAt?.toISOString() ?? null,
    categories: p.categories.map((c) => ({ name: c.name })),
    tags: p.tags.map((t) => ({ name: t.name })),
  }));

  return <PostListClient posts={clientPosts} />;
}


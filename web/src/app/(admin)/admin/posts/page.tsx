import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { postsQueries } from "@/lib/server-queries";
import { PostListClient } from "@/components/admin/post-list-client";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { normalizeAdminPostListQuery } from "@/modules/posts";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPostsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!sessionHasPermission(session, "posts:write")) return <AdminAccessDenied />;

  const filters = normalizeAdminPostListQuery((await searchParams) ?? {});
  const [result, categories, tags] = await Promise.all([
    postsQueries.listAdminPosts(filters),
    postsQueries.listAllCategories(),
    postsQueries.listAllTags(),
  ]);

  // 轉換為 client 端格式
  const clientPosts = result.data.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    featured: p.featured,
    allowRawHtml: p.allowRawHtml,
    showRawHtmlToc: p.showRawHtmlToc,
    updatedAt: p.updatedAt.toISOString(),
    publishedAt: p.publishedAt?.toISOString() ?? null,
    deletedAt: p.deletedAt?.toISOString() ?? null,
    categories: p.categories.map((c) => ({ name: c.name })),
    tags: p.tags.map((t) => ({ name: t.name })),
  }));

  return (
    <PostListClient
      posts={clientPosts}
      pagination={result.pagination}
      filters={filters}
      categories={categories.filter((category) => !category.deletedAt).map((category) => ({ id: category.id, name: category.name }))}
      tags={tags.filter((tag) => !tag.deletedAt).map((tag) => ({ id: tag.id, name: tag.name }))}
      selectionKey={JSON.stringify(filters)}
    />
  );
}

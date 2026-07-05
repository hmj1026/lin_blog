import { notFound } from "next/navigation";
import { AdminPostForm } from "@/components/admin/post-form";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { postsQueries } from "@/lib/server-queries";
import { formatLocalDateTimeInput } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPostEditPage({ params }: Props) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "posts:write"))) redirect("/admin");

  const { id } = await params;
  const [post, categories, tags] = await Promise.all([
    postsQueries.getPostById(id),
    postsQueries.listActiveCategories(),
    postsQueries.listActiveTags(),
  ]);
  if (!post) return notFound();

  return (
    <AdminPostForm
      mode="edit"
      postId={post.id}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      tags={tags.map((t) => ({ id: t.id, name: t.name }))}
      initial={{
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        readingTime: post.readingTime,
        featured: post.featured,
        allowRawHtml: post.allowRawHtml,
        status: post.status,
        publishedAt: post.publishedAt ? formatLocalDateTimeInput(new Date(post.publishedAt)) : "",
        categoryIds: post.categories.map((c) => c.id),
        tagIds: post.tags.map((t) => t.id),
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        ogImage: post.ogImage,
      }}
    />
  );
}

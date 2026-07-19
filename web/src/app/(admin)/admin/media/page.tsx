import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { MediaLibraryClient } from "@/components/admin/media-library-client";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { mediaQueries } from "@/lib/server-queries";
import { toUploadListItemDto } from "@/modules/media/presentation/dto";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminMediaPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!sessionHasPermission(session, "uploads:write")) return <AdminAccessDenied />;

  const query = (await searchParams) ?? {};
  const requestedType = first(query.type) ?? "";
  const type = ["image/", "video/", "application/pdf"].includes(requestedType) ? requestedType : "";
  const result = await mediaQueries.listUploadsPage({
    search: first(query.q),
    type,
    page: Number(first(query.page) ?? 1),
    pageSize: Number(first(query.pageSize) ?? 20),
  });

  return (
    <MediaLibraryClient
      initialUploads={result.items.map(toUploadListItemDto)}
      filters={{ search: first(query.q)?.trim().slice(0, 100) ?? "", type }}
      pagination={{ page: result.page, pageSize: result.pageSize, total: result.total, totalPages: result.totalPages }}
    />
  );
}

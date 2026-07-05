import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { MediaLibraryClient } from "@/components/admin/media-library-client";

export default async function AdminMediaPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!sessionHasPermission(session, "uploads:write")) redirect("/admin");

  return <MediaLibraryClient />;
}

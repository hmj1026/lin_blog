import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { ImportExportClient } from "@/components/admin/import-export-client";

export default async function AdminImportExportPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "posts:write"))) redirect("/admin");

  return <ImportExportClient />;
}

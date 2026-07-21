import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { ImportExportClient } from "@/components/admin/import-export-client";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";

export default async function AdminImportExportPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!(await roleHasPermission(session.user.roleId, "posts:write"))) return <AdminAccessDenied />;

  return <ImportExportClient />;
}

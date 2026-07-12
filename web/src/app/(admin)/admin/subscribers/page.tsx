import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { SubscriberListClient } from "@/components/admin/subscriber-list-client";

/**
 * 後台訂閱者名單頁（唯讀）。
 *
 * 受 `subscribers:view` 權限保護（預設僅 ADMIN）；未登入或缺少權限一律導向，
 * 不得渲染任何訂閱者資料。
 */
export default async function AdminSubscribersPage() {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!sessionHasPermission(session, "subscribers:view")) redirect("/admin");

  return <SubscriberListClient />;
}

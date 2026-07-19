import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { SubscriberListClient } from "@/components/admin/subscriber-list-client";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { newsletterQueries } from "@/lib/server-queries";
import { logger } from "@/lib/logger";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInteger(value: string | undefined, fallback: number) {
  return value && /^\d+$/.test(value) && Number(value) > 0 ? Number(value) : fallback;
}

/**
 * 後台訂閱者名單頁（唯讀）。
 *
 * 受 `subscribers:view` 權限保護（預設僅 ADMIN）；缺少權限時顯示拒絕狀態，
 * 且不得渲染任何訂閱者資料。
 */
export default async function AdminSubscribersPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!sessionHasPermission(session, "subscribers:view")) return <AdminAccessDenied />;

  const query = (await searchParams) ?? {};
  const search = first(query.q)?.trim().slice(0, 200) || undefined;
  const page = positiveInteger(first(query.page), 1);
  const pageSize = positiveInteger(first(query.pageSize), 20);

  let data:
    | { result: Awaited<ReturnType<typeof newsletterQueries.listSubscribers>>; growth: Awaited<ReturnType<typeof newsletterQueries.countSubscriberGrowth>> }
    | null = null;
  try {
    const [result, growth] = await Promise.all([
      newsletterQueries.listSubscribers({ search, page, pageSize }),
      newsletterQueries.countSubscriberGrowth(),
    ]);
    data = { result, growth };
  } catch (error) {
    // 名單載入失敗以 loadError 狀態呈現給使用者，但伺服器端須留下可診斷的日誌，不得靜默吞掉。
    logger.error("Subscriber list load failed", { message: error instanceof Error ? error.message : "unknown" });
    data = null;
  }

  if (!data) {
    return <SubscriberListClient items={[]} filters={{ search: search ?? "" }} pagination={{ page: 1, pageSize: 20, total: 0, totalPages: 1 }} growth={{ last7Days: 0, last30Days: 0 }} loadError />;
  }
  return <SubscriberListClient
    items={data.result.items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
    filters={{ search: search ?? "" }}
    pagination={{ page: data.result.page, pageSize: data.result.pageSize, total: data.result.total, totalPages: Math.max(1, Math.ceil(data.result.total / data.result.pageSize)) }}
    growth={data.growth}
  />;
}

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac";
import { auditQueries } from "@/lib/server-queries";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Pagination } from "@/components/pagination";
import { buttonStyles } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+08:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** 具專用 audit:view 權限、URL 篩選與 bounded pagination 的活動紀錄頁。 */
export default async function AdminAuditPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!(await roleHasPermission(session.user.roleId, "audit:view"))) return <AdminAccessDenied />;

  const params = (await searchParams) ?? {};
  const from = first(params.from);
  const to = first(params.to);
  const actor = first(params.actor)?.trim().slice(0, 100) || undefined;
  const resource = first(params.resource)?.trim().slice(0, 100) || undefined;
  const rawPage = Number(first(params.page));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const result = await auditQueries.listAuditEvents({
    page,
    pageSize: 20,
    since: parseDate(from),
    until: parseDate(to, true),
    actor,
    resource,
  });
  const queryParams = Object.fromEntries(Object.entries({ from, to, actor, resource }).filter((entry): entry is [string, string] => Boolean(entry[1])));

  return <div className="space-y-6">
    <h1 className="font-display text-3xl text-primary">活動紀錄</h1>
    <p className="text-sm text-base-300">僅顯示最近 365 天的高風險管理操作；摘要不保存密碼、token 或完整內容。</p>
    <form method="get" aria-label="活動紀錄篩選" className="grid gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-5">
      <label className="grid gap-1 text-sm font-semibold">起日<input type="date" name="from" defaultValue={from ?? ""} className="rounded-xl border border-line px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-semibold">迄日<input type="date" name="to" defaultValue={to ?? ""} className="rounded-xl border border-line px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-semibold">Actor<input name="actor" defaultValue={actor ?? ""} className="rounded-xl border border-line px-3 py-2" /></label>
      <label className="grid gap-1 text-sm font-semibold">Resource<input name="resource" defaultValue={resource ?? ""} className="rounded-xl border border-line px-3 py-2" /></label>
      <div className="flex items-end"><button type="submit" className={buttonStyles({ variant: "primary" })}>套用篩選</button></div>
    </form>
    <section className="space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
      <p className="text-sm text-base-300">共 {result.total} 筆，第 {result.page} / {result.totalPages} 頁</p>
      <AdminDataTable ariaLabel="活動紀錄資料表">
        <thead className="bg-base-100 text-left text-base-300"><tr><th className="px-4 py-3">時間</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Resource</th><th className="px-4 py-3">安全摘要</th></tr></thead>
        <tbody>{result.items.map((event) => <tr key={event.id} className="border-t border-line"><td className="px-4 py-3 whitespace-nowrap">{formatDateTime(event.createdAt)}</td><td className="px-4 py-3">{event.actorId}</td><td className="px-4 py-3 font-semibold">{event.action}</td><td className="px-4 py-3">{event.resourceType} / {event.resourceId}</td><td className="px-4 py-3 font-mono text-xs break-all">{JSON.stringify(event.summary)}</td></tr>)}</tbody>
      </AdminDataTable>
      {result.items.length === 0 ? <p className="text-center text-sm text-base-300">找不到符合條件的活動紀錄</p> : null}
      <Pagination currentPage={result.page} totalPages={result.totalPages} baseUrl="/admin/audit" queryParams={queryParams} />
    </section>
  </div>;
}

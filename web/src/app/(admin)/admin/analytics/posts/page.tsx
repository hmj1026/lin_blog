import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { sessionHasPermission } from "@/lib/rbac";
import { analyticsQueries, postsQueries } from "@/lib/server-queries";
import { buttonStyles } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminTable } from "@/components/admin/table";
import { first, parseDate } from "@/lib/admin-search-params";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPostAnalyticsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) return <AdminAccessDenied />;
  if (!sessionHasPermission(session, "analytics:view")) return <AdminAccessDenied />;

  const params = (await searchParams) ?? {};
  const days = Number(first(params.days) ?? "7");
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 7;
  const canViewSensitive = sessionHasPermission(session, "analytics:view_sensitive");
  const categoryId = first(params.category) || undefined;
  const tagId = first(params.tag) || undefined;
  const publishedFromRaw = first(params.publishedFrom);
  const publishedToRaw = first(params.publishedTo);
  const publishedFrom = parseDate(publishedFromRaw);
  const publishedTo = parseDate(publishedToRaw, true);
  const [list, categories, tags] = await Promise.all([
    analyticsQueries.listPostAnalyticsSummary({ days: safeDays, categoryId, tagId, publishedFrom, publishedTo }),
    postsQueries.listAllCategories(),
    postsQueries.listAllTags(),
  ]);
  const growthCount = list.filter((row) => (row.percentChange ?? 0) > 0).length;
  const declineCount = list.filter((row) => (row.percentChange ?? 0) < 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-primary">文章統計</h1>
      </div>

      <form method="get" className="grid gap-3 rounded-2xl border border-line bg-white p-4 md:grid-cols-3 lg:grid-cols-6" aria-label="文章統計篩選">
        <label className="grid gap-1 text-sm font-semibold">期間<select name="days" defaultValue={safeDays} className="rounded-xl border border-line px-3 py-2"><option value="7">7 天</option><option value="14">14 天</option><option value="30">30 天</option><option value="90">90 天</option></select></label>
        <label className="grid gap-1 text-sm font-semibold">分類<select name="category" aria-label="分類篩選" defaultValue={categoryId ?? ""} className="rounded-xl border border-line px-3 py-2"><option value="">全部分類</option>{categories.filter((item) => !item.deletedAt).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">標籤<select name="tag" aria-label="標籤篩選" defaultValue={tagId ?? ""} className="rounded-xl border border-line px-3 py-2"><option value="">全部標籤</option>{tags.filter((item) => !item.deletedAt).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold">發布起日<input name="publishedFrom" type="date" defaultValue={publishedFromRaw ?? ""} className="rounded-xl border border-line px-3 py-2" /></label>
        <label className="grid gap-1 text-sm font-semibold">發布迄日<input name="publishedTo" type="date" defaultValue={publishedToRaw ?? ""} className="rounded-xl border border-line px-3 py-2" /></label>
        <div className="flex items-end"><button type="submit" className={buttonStyles({ variant: "primary" })}>套用篩選</button></div>
      </form>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <div className="text-sm text-base-300">期間：最近 {safeDays} 個 Asia/Taipei 日曆日，包含完整資料庫事件。</div>
        <div className="mt-2 text-sm font-semibold text-primary">成長 {growthCount} 篇・衰退 {declineCount} 篇</div>
        <AdminTable ariaLabel="文章統計資料表" className="mt-4">
            <thead className="bg-base-100 text-left text-base-300">
              <tr>
                <th className="px-4 py-3">文章</th>
                <th className="px-4 py-3">瀏覽</th>
                <th className="px-4 py-3">不重複</th>
                <th className="px-4 py-3">前期比較</th>
                <th className="px-4 py-3">主要來源</th>
                <th className="px-4 py-3">最後瀏覽</th>
                <th className="px-4 py-3">動作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr key={row.postId} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-primary">{row.title}</div>
                    <div className="text-xs text-base-300">/{row.slug}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary"><div>{row.views}</div><div className="text-xs font-normal text-base-300">每日平均 {(row.views / safeDays).toFixed(1)} 次</div></td>
                  <td className="px-4 py-3 font-semibold text-primary">{row.uniqueCount}</td>
                  <td className="px-4 py-3 text-base-300">
                    <div>{row.previousViews} 次</div>
                    <div className="text-xs">
                      {row.percentChange === null ? "新增流量" : `${row.percentChange >= 0 ? "+" : ""}${row.percentChange}%`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-base-300">
                    {row.sources[0] ? `${row.sources[0].name} ${row.views > 0 ? Math.round((row.sources[0].count / row.views) * 100) : 0}%` : "直接／未知 0%"}
                  </td>
                  <td className="px-4 py-3 text-base-300">{row.lastViewedAt ? formatDateTime(row.lastViewedAt) : "-"}</td>
                  <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={`/blog/${encodeURIComponent(row.slug)}`}
                      target="_blank"
                      rel="noreferrer"
                      className={buttonStyles({ variant: "outline", size: "sm" })}
                    >
                      開前台
                    </a>
                    {canViewSensitive && (
                      <Link
                        href={`/admin/analytics/posts/${row.postId}?days=${safeDays}`}
                        className={buttonStyles({ variant: "secondary", size: "sm" })}
                      >
                        進階稽核
                      </Link>
                    )}
                  </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-base-300">
                    目前沒有統計資料
                  </td>
                </tr>
              )}
            </tbody>
        </AdminTable>
      </div>
    </div>
  );
}

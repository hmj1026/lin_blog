import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { roleHasPermission } from "@/lib/rbac";
import { analyticsUseCases } from "@/modules/analytics";
import { buttonStyles } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { DaysFilter } from "@/components/admin/days-filter";

type Props = { searchParams?: Promise<{ days?: string }> };

export default async function AdminPostAnalyticsPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session?.user?.email) redirect("/login");
  if (!session.user.roleId) redirect("/admin");
  if (!(await roleHasPermission(session.user.roleId, "analytics:view"))) redirect("/admin");

  const params = await searchParams;
  const days = Number(params?.days ?? "7");
  const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 7;
  const canViewSensitive = await roleHasPermission(session.user.roleId, "analytics:view_sensitive");
  const list = await analyticsUseCases.listPostAnalyticsSummary({ days: safeDays });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-primary">文章統計</h1>
        <DaysFilter baseUrl="/admin/analytics/posts" currentDays={safeDays} />
      </div>

      <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <div className="text-sm text-base-300">期間：最近 {safeDays} 天（最多取 5000 筆事件做彙總）</div>
        <div className="mt-4 overflow-hidden rounded-xl border border-line">
          <table className="min-w-full text-sm">
            <thead className="bg-base-100 text-left text-base-300">
              <tr>
                <th className="px-4 py-3">文章</th>
                <th className="px-4 py-3">瀏覽</th>
                <th className="px-4 py-3">不重複</th>
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
                  <td className="px-4 py-3 font-semibold text-primary">{row.views}</td>
                  <td className="px-4 py-3 font-semibold text-primary">{row.uniqueCount}</td>
                  <td className="px-4 py-3 text-base-300">{formatDateTime(row.lastViewedAt)}</td>
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
                        查看事件
                      </Link>
                    )}
                  </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-base-300">
                    目前沒有統計資料
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

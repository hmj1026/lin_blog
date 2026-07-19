import { StatsCard } from "@/components/admin/stats-card";
import { postsQueries, securityAdminQueries, analyticsQueries } from "@/lib/server-queries";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { DashboardWorkSummary } from "@/components/admin/dashboard-work-summary";
import { getSession } from "@/lib/auth";
import { sessionHasPermission } from "@/lib/rbac";

export default async function AdminDashboardPage() {
  const session = await getSession();
  // 儀表板混合多個權限領域：草稿／排程／近期文章屬 posts:write，成效排行與圖表屬 analytics:view。
  // 僅在具備對應權限時才查詢與呈現，避免向只有 admin:access 的角色洩露文章標題與成效數據。
  const canManagePosts = sessionHasPermission(session, "posts:write");
  const canViewAnalytics = sessionHasPermission(session, "analytics:view");
  const listParams = { query: undefined, categoryId: undefined, tagId: undefined, featured: undefined, deleted: false, sort: "updated-desc" as const, page: 1, pageSize: 5 };
  const [postCount, categoryCount, tagCount, userCount, viewCount7d, drafts, scheduled, recent, analytics] = await Promise.all([
    postsQueries.countActivePosts(),
    postsQueries.countActiveCategories(),
    postsQueries.countActiveTags(),
    securityAdminQueries.countActiveUsers(),
    analyticsQueries.countViews({ days: 7 }),
    canManagePosts ? postsQueries.listAdminPosts({ ...listParams, status: "DRAFT" }) : Promise.resolve(null),
    canManagePosts ? postsQueries.listAdminPosts({ ...listParams, status: "SCHEDULED" }) : Promise.resolve(null),
    canManagePosts ? postsQueries.listAdminPosts(listParams) : Promise.resolve(null),
    canViewAnalytics ? analyticsQueries.listPostAnalyticsSummary({ days: 7 }) : Promise.resolve([]),
  ]);

  const shortcuts = [
    ...(canManagePosts ? [{ href: "/admin/posts/new", label: "新增文章" }, { href: "/admin/posts", label: "管理文章" }] : []),
    ...(sessionHasPermission(session, "uploads:write") ? [{ href: "/admin/media", label: "管理媒體" }] : []),
    ...(sessionHasPermission(session, "subscribers:view") ? [{ href: "/admin/subscribers", label: "查看訂閱者" }] : []),
    ...(sessionHasPermission(session, "users:manage") ? [{ href: "/admin/users", label: "使用者管理" }] : []),
  ];
  const comparable = analytics.filter((item) => item.percentChange !== null);
  const performance = {
    growth: comparable.filter((item) => (item.percentChange ?? 0) > 0).sort((a, b) => (b.percentChange ?? 0) - (a.percentChange ?? 0)).slice(0, 3).map((item) => ({ id: item.postId, title: item.title, percentChange: item.percentChange ?? 0 })),
    decline: comparable.filter((item) => (item.percentChange ?? 0) < 0).sort((a, b) => (a.percentChange ?? 0) - (b.percentChange ?? 0)).slice(0, 3).map((item) => ({ id: item.postId, title: item.title, percentChange: item.percentChange ?? 0 })),
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-primary">儀表板</h1>
      <div className="grid gap-4 md:grid-cols-5">
        <StatsCard label="文章數" value={postCount} />
        <StatsCard label="分類" value={categoryCount} />
        <StatsCard label="標籤" value={tagCount} />
        <StatsCard label="使用者" value={userCount} />
        <StatsCard label="近 7 天瀏覽" value={viewCount7d} />
      </div>
      {(canManagePosts || canViewAnalytics) ? (
        <DashboardWorkSummary
          drafts={{ total: drafts?.pagination.total ?? 0, items: drafts?.data.map((item) => ({ id: item.id, title: item.title })) ?? [] }}
          scheduled={{ total: scheduled?.pagination.total ?? 0, items: scheduled?.data.map((item) => ({ id: item.id, title: item.title })) ?? [] }}
          recent={recent?.data.map((item) => ({ id: item.id, title: item.title })) ?? []}
          performance={performance}
          shortcuts={shortcuts}
        />
      ) : null}

      {/* 圖表區域（/api/analytics/stats 需 analytics:view；無權限者不渲染以免無謂的失敗請求） */}
      {canViewAnalytics ? <DashboardCharts /> : null}
    </div>
  );
}

import { StatsCard } from "@/components/admin/stats-card";
import { postsQueries, securityAdminQueries, analyticsQueries } from "@/lib/server-queries";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { DashboardWorkSummary } from "@/components/admin/dashboard-work-summary";
import { getSession } from "@/lib/auth";
import { sessionHasPermission } from "@/lib/rbac";

export default async function AdminDashboardPage() {
  const session = await getSession();
  // 儀表板混合多個權限領域：統計卡、草稿／排程／近期文章、成效排行與圖表各屬不同權限。
  // 僅在具備對應權限時才查詢與呈現，避免向只有 admin:access 的角色洩露未授予領域的統計與數據。
  const canManagePosts = sessionHasPermission(session, "posts:write");
  const canManageCategories = sessionHasPermission(session, "categories:manage");
  const canManageTags = sessionHasPermission(session, "tags:manage");
  const canManageUsers = sessionHasPermission(session, "users:manage");
  const canViewAnalytics = sessionHasPermission(session, "analytics:view");
  const listParams = { query: undefined, categoryId: undefined, tagId: undefined, featured: undefined, deleted: false, sort: "updated-desc" as const, page: 1, pageSize: 5 };
  const [postCount, categoryCount, tagCount, userCount, viewCount7d, drafts, scheduled, recent, analytics] = await Promise.all([
    canManagePosts ? postsQueries.countActivePosts() : Promise.resolve(null),
    canManageCategories ? postsQueries.countActiveCategories() : Promise.resolve(null),
    canManageTags ? postsQueries.countActiveTags() : Promise.resolve(null),
    canManageUsers ? securityAdminQueries.countActiveUsers() : Promise.resolve(null),
    canViewAnalytics ? analyticsQueries.countViews({ days: 7 }) : Promise.resolve(null),
    canManagePosts ? postsQueries.listAdminPosts({ ...listParams, status: "DRAFT" }) : Promise.resolve(null),
    canManagePosts ? postsQueries.listAdminPosts({ ...listParams, status: "SCHEDULED" }) : Promise.resolve(null),
    canManagePosts ? postsQueries.listAdminPosts(listParams) : Promise.resolve(null),
    canViewAnalytics ? analyticsQueries.listPostAnalyticsSummary({ days: 7 }) : Promise.resolve([]),
  ]);

  // 每張統計卡各依其領域權限呈現；未授予者不查詢也不渲染。
  const statCards = [
    canManagePosts ? { label: "文章數", value: postCount } : null,
    canManageCategories ? { label: "分類", value: categoryCount } : null,
    canManageTags ? { label: "標籤", value: tagCount } : null,
    canManageUsers ? { label: "使用者", value: userCount } : null,
    canViewAnalytics ? { label: "近 7 天瀏覽", value: viewCount7d } : null,
  ].filter((card): card is { label: string; value: number | null } => card !== null);

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
      {statCards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-5">
          {statCards.map((card) => (
            <StatsCard key={card.label} label={card.label} value={card.value ?? 0} />
          ))}
        </div>
      ) : null}
      {canManagePosts ? (
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

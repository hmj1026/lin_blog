import { StatsCard } from "@/components/admin/stats-card";
import { postsUseCases } from "@/modules/posts";
import { DashboardCharts } from "@/components/admin/dashboard-charts";
import { securityAdminUseCases } from "@/modules/security-admin";
import { analyticsUseCases } from "@/modules/analytics";

export default async function AdminDashboardPage() {
  const [postCount, categoryCount, tagCount, userCount, viewCount7d] = await Promise.all([
    postsUseCases.countActivePosts(),
    postsUseCases.countActiveCategories(),
    postsUseCases.countActiveTags(),
    securityAdminUseCases.countActiveUsers(),
    analyticsUseCases.countViews({ days: 7 }),
  ]);

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
      
      {/* 圖表區域 */}
      <DashboardCharts />
    </div>
  );
}

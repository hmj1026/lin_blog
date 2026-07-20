import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardPage from "@/app/(admin)/admin/page";
import { getSession } from "@/lib/auth";
import { postsQueries, securityAdminQueries, analyticsQueries } from "@/lib/server-queries";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/server-queries", () => ({
  postsQueries: { countActivePosts: vi.fn(), countActiveCategories: vi.fn(), countActiveTags: vi.fn(), listAdminPosts: vi.fn() },
  securityAdminQueries: { countActiveUsers: vi.fn() },
  analyticsQueries: { countViews: vi.fn(), listPostAnalyticsSummary: vi.fn() },
}));
vi.mock("@/components/admin/dashboard-charts", () => ({ DashboardCharts: () => <div /> }));
vi.mock("@/components/admin/dashboard-work-summary", () => ({ DashboardWorkSummary: (props: unknown) => <div data-testid="work-summary" data-props={JSON.stringify(props)} /> }));

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(postsQueries.countActivePosts).mockResolvedValue(10);
    vi.mocked(postsQueries.countActiveCategories).mockResolvedValue(3);
    vi.mocked(postsQueries.countActiveTags).mockResolvedValue(4);
    vi.mocked(securityAdminQueries.countActiveUsers).mockResolvedValue(2);
    vi.mocked(analyticsQueries.countViews).mockResolvedValue(20);
    vi.mocked(postsQueries.listAdminPosts).mockResolvedValue({ data: [], pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 } });
    vi.mocked(analyticsQueries.listPostAnalyticsSummary).mockResolvedValue([]);
  });

  it("以有界查詢取得草稿、排程與近期更新", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { permissions: ["posts:write"] } } as never);

    await AdminDashboardPage();

    expect(postsQueries.listAdminPosts).toHaveBeenCalledTimes(3);
    expect(postsQueries.listAdminPosts).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT", page: 1, pageSize: 5 }));
    expect(postsQueries.listAdminPosts).toHaveBeenCalledWith(expect.objectContaining({ status: "SCHEDULED", page: 1, pageSize: 5 }));
  });

  it("EDITOR 快捷操作不包含未授權管理入口", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { permissions: ["admin:access", "posts:write"] } } as never);

    const ui = await AdminDashboardPage();
    const props = (ui.props.children as Array<{ props?: { shortcuts?: Array<{ href: string }> } }>).find((child) => child?.props?.shortcuts)?.props;

    expect(props?.shortcuts?.map((item) => item.href)).toEqual(expect.arrayContaining(["/admin/posts", "/admin/posts/new"]));
    expect(props?.shortcuts?.map((item) => item.href)).not.toContain("/admin/users");
  });

  it("僅有 admin:access 時不查詢草稿或成效，也不洩露工作摘要", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { permissions: ["admin:access"] } } as never);

    const ui = await AdminDashboardPage();

    // 沒有 posts:write / analytics:view 就不得觸發對應查詢，避免洩露文章標題與成效數據。
    expect(postsQueries.listAdminPosts).not.toHaveBeenCalled();
    expect(analyticsQueries.listPostAnalyticsSummary).not.toHaveBeenCalled();
    const children = ui.props.children as Array<{ props?: Record<string, unknown> } | null>;
    expect(children.some((child) => child?.props ? "drafts" in child.props : false)).toBe(false);
  });

  it("僅有 admin:access 時不查詢任何領域統計卡數據", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { permissions: ["admin:access"] } } as never);

    await AdminDashboardPage();

    // 統計卡查詢須依各自權限；無任何領域權限時完全不觸發，避免洩露未授予領域的統計。
    expect(postsQueries.countActivePosts).not.toHaveBeenCalled();
    expect(postsQueries.countActiveCategories).not.toHaveBeenCalled();
    expect(postsQueries.countActiveTags).not.toHaveBeenCalled();
    expect(securityAdminQueries.countActiveUsers).not.toHaveBeenCalled();
    expect(analyticsQueries.countViews).not.toHaveBeenCalled();
  });

  it("analytics:view 但無 posts:write 者不見以 0 假冒的草稿／排程工作摘要 (C7)", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { permissions: ["analytics:view"] } } as never);

    const ui = await AdminDashboardPage();

    // 沒有 posts:write 就不得查詢草稿/排程，避免以 total:0 假冒實際計數。
    expect(postsQueries.listAdminPosts).not.toHaveBeenCalled();
    // 工作摘要面板（含 drafts/scheduled 假 0）不得渲染給僅具分析權限者。
    const children = ui.props.children as Array<{ props?: Record<string, unknown> } | null>;
    expect(children.some((child) => (child?.props ? "drafts" in child.props : false))).toBe(false);
  });

  it("僅具 posts:write 時只查詢文章統計，不查其他領域", async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { permissions: ["admin:access", "posts:write"] } } as never);

    await AdminDashboardPage();

    expect(postsQueries.countActivePosts).toHaveBeenCalledTimes(1);
    expect(postsQueries.countActiveCategories).not.toHaveBeenCalled();
    expect(securityAdminQueries.countActiveUsers).not.toHaveBeenCalled();
    expect(analyticsQueries.countViews).not.toHaveBeenCalled();
  });
});

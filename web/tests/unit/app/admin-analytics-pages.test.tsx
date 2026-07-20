import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminPostAnalyticsPage from "@/app/(admin)/admin/analytics/posts/page";
import AdminPostEventBrowserPage, {
  deriveDefaultFromDate,
} from "@/app/(admin)/admin/analytics/posts/[postId]/page";
import { analyticsQueries } from "@/lib/server-queries";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { postsQueries } from "@/lib/server-queries";

// Mock dependencies
vi.mock("@/modules/analytics", () => ({
  DEVICE_TYPES: ["DESKTOP", "MOBILE", "TABLET", "BOT", "OTHER"],
  isDeviceType: (v: string) => ["DESKTOP", "MOBILE", "TABLET", "BOT", "OTHER"].includes(v),
  maskIpAddress: (ip: string | null) => ip ? "127.0.0.xxx" : "—",
}));

vi.mock("@/lib/server-queries", () => ({
  analyticsQueries: {
    listPostAnalyticsSummary: vi.fn(),
    getPostSummary: vi.fn(),
    listPostViewEvents: vi.fn(),
  },
  postsQueries: { listAllCategories: vi.fn(), listAllTags: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("Redirected"); }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock data
const mockSession = {
  user: {
    roleId: "admin",
    email: "admin@example.com",
    permissions: ["analytics:view", "analytics:view_sensitive"],
  },
};
const mockSessionNoPermission = {
  user: { roleId: "admin", email: "admin@example.com", permissions: [] },
};
const mockAnalyticsList = [
  {
    postId: "1",
    title: "Test Post",
    slug: "test-post",
    views: 100,
    uniqueCount: 80,
    previousViews: 50,
    previousUniqueCount: 40,
    percentChange: 100,
    sources: [{ source: "ORGANIC_SEARCH", name: "自然搜尋", count: 70 }],
    lastViewedAt: new Date("2025-01-01T12:00:00Z"),
  },
];
const mockPostSummary = {
  id: "1",
  title: "Test Post",
  slug: "test-post",
  deletedAt: null,
};
const mockEvents = {
  total: 150,
  events: [
    {
      id: "ev1",
      viewedAt: new Date("2025-01-01T10:00:00Z"),
      deviceType: "desktop",
      ip: "127.0.0.1",
      userAgent: "Chrome",
      referer: "Google",
    },
  ],
};

describe("Admin Post Analytics Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as any).mockResolvedValue(mockSession);
    (analyticsQueries.listPostAnalyticsSummary as any).mockResolvedValue(mockAnalyticsList);
    (postsQueries.listAllCategories as any).mockResolvedValue([{ id: "cat-1", name: "設計", deletedAt: null }]);
    (postsQueries.listAllTags as any).mockResolvedValue([{ id: "tag-1", name: "Next.js", deletedAt: null }]);
  });

  it("以 URL 套用分類、標籤、發布期間並顯示每日平均、來源占比與成長摘要", async () => {
    const ui = await AdminPostAnalyticsPage({ searchParams: Promise.resolve({ days: "7", category: "cat-1", tag: "tag-1", publishedFrom: "2025-01-01", publishedTo: "2025-12-31" }) });
    render(ui);

    expect(analyticsQueries.listPostAnalyticsSummary).toHaveBeenCalledWith(expect.objectContaining({ categoryId: "cat-1", tagId: "tag-1", publishedFrom: expect.any(Date), publishedTo: expect.any(Date) }));
    expect(screen.getByText("每日平均 14.3 次")).toBeInTheDocument();
    expect(screen.getByText("自然搜尋 70%")) .toBeInTheDocument();
    expect(screen.getByText("成長 1 篇・衰退 0 篇")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "分類篩選" })).toHaveValue("cat-1");
  });

  it("normalizes duplicate filter query params to a single value without crashing (C4)", async () => {
    // Next.js 對重複 query param 給出 string[]；頁面須單值正規化，
    // 不得把陣列直接送入 Prisma 查詢（會 PrismaClientValidationError 使整頁崩潰）。
    const ui = await AdminPostAnalyticsPage({
      searchParams: Promise.resolve({
        days: "7",
        category: ["cat-1", "cat-2"],
        tag: ["tag-1", "tag-2"],
        publishedFrom: ["2025-01-01", "2025-06-01"],
      }) as any,
    });
    render(ui);

    expect(screen.getByText("文章統計")).toBeInTheDocument();
    expect(analyticsQueries.listPostAnalyticsSummary).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "cat-1", tagId: "tag-1", publishedFrom: expect.any(Date) })
    );
  });

  it("renders analytics list", async () => {
    const ui = await AdminPostAnalyticsPage({ searchParams: Promise.resolve({ days: "7" }) });
    render(ui);

    expect(screen.getByText("文章統計")).toBeInTheDocument();
    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("+100%")).toBeInTheDocument();
    expect(screen.getByText("自然搜尋 70%")).toBeInTheDocument();
    expect(screen.queryByText(/5000/)).not.toBeInTheDocument();
    // Verify date formatting (simple check)
    expect(screen.getByText(/2025-01-01/)).toBeInTheDocument();
    
    // Check view sensitive link
    expect(screen.getByText("進階稽核")).toBeInTheDocument();
  });

  it("renders access denied without querying analytics if permission is missing", async () => {
    (getSession as any).mockResolvedValue(mockSessionNoPermission);
    const ui = await AdminPostAnalyticsPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByRole("heading", { name: "無法存取此頁面" })).toBeInTheDocument();
    expect(analyticsQueries.listPostAnalyticsSummary).not.toHaveBeenCalled();
  });

  it("shows aggregate performance without exposing the advanced audit to a standard analytics viewer", async () => {
    (getSession as any).mockResolvedValue({
      user: { roleId: "analyst", email: "analyst@example.com", permissions: ["analytics:view"] },
    });

    const ui = await AdminPostAnalyticsPage({ searchParams: Promise.resolve({ days: "7" }) });
    render(ui);

    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.getByText("自然搜尋 70%")).toBeInTheDocument();
    expect(screen.queryByText("進階稽核")).not.toBeInTheDocument();
  });
});

describe("Admin Post Event Browser Page", () => {
  const params = Promise.resolve({ postId: "1" });

  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as any).mockResolvedValue(mockSession);
    (analyticsQueries.getPostSummary as any).mockResolvedValue(mockPostSummary);
    (analyticsQueries.listPostViewEvents as any).mockResolvedValue(mockEvents);
  });

  it("derives the default from date from the current request time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T12:00:00.000Z"));

    expect(deriveDefaultFromDate(7)).toEqual(new Date("2026-07-11T12:00:00.000Z"));

    vi.useRealTimers();
  });

  it("renders event details", async () => {
    const searchParams = Promise.resolve({ days: "7" });
    const ui = await AdminPostEventBrowserPage({ params, searchParams });
    render(ui);

    expect(screen.getByText("進階事件稽核")).toBeInTheDocument();
    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.xxx")).toBeInTheDocument();
    expect(screen.queryByText("127.0.0.1")).not.toBeInTheDocument();
  });

  it("does not query or render raw events without sensitive permission", async () => {
    (getSession as any).mockResolvedValue({
      user: { roleId: "analyst", email: "analyst@example.com", permissions: ["analytics:view"] },
    });

    const ui = await AdminPostEventBrowserPage({ params, searchParams: Promise.resolve({ days: "7" }) });
    render(ui);

    expect(screen.getByRole("heading", { name: "無法存取此頁面" })).toBeInTheDocument();
    expect(analyticsQueries.getPostSummary).not.toHaveBeenCalled();
    expect(analyticsQueries.listPostViewEvents).not.toHaveBeenCalled();
  });

  it("redirects if post not found", async () => {
    (analyticsQueries.getPostSummary as any).mockResolvedValue(null);
    try {
      await AdminPostEventBrowserPage({ params, searchParams: Promise.resolve({}) });
    } catch (e: any) {
      expect(e.message).toBe("Redirected");
    }
    expect(redirect).toHaveBeenCalledWith("/admin/analytics/posts");
  });
});

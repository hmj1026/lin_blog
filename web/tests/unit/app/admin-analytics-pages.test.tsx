import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminPostAnalyticsPage from "@/app/(admin)/admin/analytics/posts/page";
import AdminPostEventBrowserPage from "@/app/(admin)/admin/analytics/posts/[postId]/page";
import { analyticsUseCases } from "@/modules/analytics";
import { getSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

// Mock dependencies
vi.mock("@/modules/analytics", () => ({
  analyticsUseCases: {
    listPostAnalyticsSummary: vi.fn(),
    getPostSummary: vi.fn(),
    listPostViewEvents: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  roleHasPermission: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => { throw new Error("Redirected"); }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock data
const mockSession = { user: { roleId: "admin", email: "admin@example.com" } };
const mockAnalyticsList = [
  {
    postId: "1",
    title: "Test Post",
    slug: "test-post",
    views: 100,
    uniqueCount: 80,
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
    (roleHasPermission as any).mockResolvedValue(true);
    (analyticsUseCases.listPostAnalyticsSummary as any).mockResolvedValue(mockAnalyticsList);
  });

  it("renders analytics list", async () => {
    const ui = await AdminPostAnalyticsPage({ searchParams: Promise.resolve({ days: "7" }) });
    render(ui);

    expect(screen.getByText("文章統計")).toBeInTheDocument();
    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    // Verify date formatting (simple check)
    expect(screen.getByText(/2025-01-01/)).toBeInTheDocument();
    
    // Check view sensitive link
    expect(screen.getByText("查看事件")).toBeInTheDocument();
  });

  it("redirects if no permission", async () => {
    (roleHasPermission as any).mockResolvedValue(false);
    try {
      await AdminPostAnalyticsPage({ searchParams: Promise.resolve({}) });
    } catch (e: any) {
      expect(e.message).toBe("Redirected");
    }
    expect(redirect).toHaveBeenCalledWith("/admin");
  });
});

describe("Admin Post Event Browser Page", () => {
  const params = Promise.resolve({ postId: "1" });

  beforeEach(() => {
    vi.clearAllMocks();
    (getSession as any).mockResolvedValue(mockSession);
    (roleHasPermission as any).mockResolvedValue(true);
    (analyticsUseCases.getPostSummary as any).mockResolvedValue(mockPostSummary);
    (analyticsUseCases.listPostViewEvents as any).mockResolvedValue(mockEvents);
  });

  it("renders event details", async () => {
    const searchParams = Promise.resolve({ days: "7" });
    const ui = await AdminPostEventBrowserPage({ params, searchParams });
    render(ui);

    expect(screen.getByText("事件明細")).toBeInTheDocument();
    expect(screen.getByText("Test Post")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1")).toBeInTheDocument();
  });

  it("redirects if post not found", async () => {
    (analyticsUseCases.getPostSummary as any).mockResolvedValue(null);
    try {
      await AdminPostEventBrowserPage({ params, searchParams: Promise.resolve({}) });
    } catch (e: any) {
      expect(e.message).toBe("Redirected");
    }
    expect(redirect).toHaveBeenCalledWith("/admin/analytics/posts");
  });
});

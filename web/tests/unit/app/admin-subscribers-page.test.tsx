import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminSubscribersPage from "@/app/(admin)/admin/subscribers/page";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { newsletterQueries } from "@/lib/server-queries";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("Redirected");
  }),
}));

vi.mock("@/components/admin/subscriber-list-client", () => ({
  SubscriberListClient: (props: unknown) => <div data-testid="subscriber-list-client" data-props={JSON.stringify(props)}>subscriber list</div>,
}));

vi.mock("@/lib/server-queries", () => ({ newsletterQueries: { listSubscribers: vi.fn(), countSubscriberGrowth: vi.fn() } }));

const authorizedSession = {
  user: { roleId: "admin", email: "admin@example.com", permissions: ["admin:access", "subscribers:view"] },
};
const editorSession = {
  user: { roleId: "editor", email: "editor@example.com", permissions: ["admin:access", "posts:write"] },
};

describe("Admin Subscribers Page (server gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (newsletterQueries.listSubscribers as any).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    (newsletterQueries.countSubscriberGrowth as any).mockResolvedValue({ last7Days: 2, last30Days: 5 });
  });

  it("renders the subscriber list for an authorized ADMIN session", async () => {
    (getSession as any).mockResolvedValue(authorizedSession);

    const ui = await AdminSubscribersPage({});
    render(ui);

    expect(screen.getByTestId("subscriber-list-client")).toBeInTheDocument();
  });

  it("從 URL 正規化搜尋與分頁並在伺服器查詢資料", async () => {
    (getSession as any).mockResolvedValue(authorizedSession);

    await AdminSubscribersPage({ searchParams: Promise.resolve({ q: " reader ", page: "2", pageSize: "10" }) });

    expect(newsletterQueries.listSubscribers).toHaveBeenCalledWith({ search: "reader", page: 2, pageSize: 10 });
    expect(newsletterQueries.countSubscriberGrowth).toHaveBeenCalled();
  });

  it("renders access denied for an EDITOR without rendering subscriber data", async () => {
    (getSession as any).mockResolvedValue(editorSession);

    const ui = await AdminSubscribersPage({});
    render(ui);

    expect(screen.getByRole("heading", { name: "無法存取此頁面" })).toBeInTheDocument();
    expect(screen.queryByTestId("subscriber-list-client")).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor to login", async () => {
    (getSession as any).mockResolvedValue(null);

    await expect(AdminSubscribersPage({})).rejects.toThrow("Redirected");

    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

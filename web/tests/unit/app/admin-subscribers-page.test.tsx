import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminSubscribersPage from "@/app/(admin)/admin/subscribers/page";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("Redirected");
  }),
}));

vi.mock("@/components/admin/subscriber-list-client", () => ({
  SubscriberListClient: () => <div data-testid="subscriber-list-client">subscriber list</div>,
}));

const authorizedSession = {
  user: { roleId: "admin", email: "admin@example.com", permissions: ["admin:access", "subscribers:view"] },
};
const editorSession = {
  user: { roleId: "editor", email: "editor@example.com", permissions: ["admin:access", "posts:write"] },
};

describe("Admin Subscribers Page (server gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the subscriber list for an authorized ADMIN session", async () => {
    (getSession as any).mockResolvedValue(authorizedSession);

    const ui = await AdminSubscribersPage();
    render(ui);

    expect(screen.getByTestId("subscriber-list-client")).toBeInTheDocument();
  });

  it("redirects an EDITOR session lacking subscribers:view without rendering any subscriber data", async () => {
    (getSession as any).mockResolvedValue(editorSession);

    await expect(AdminSubscribersPage()).rejects.toThrow("Redirected");

    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("redirects an unauthenticated visitor to login", async () => {
    (getSession as any).mockResolvedValue(null);

    await expect(AdminSubscribersPage()).rejects.toThrow("Redirected");

    expect(redirect).toHaveBeenCalledWith("/login");
  });
});

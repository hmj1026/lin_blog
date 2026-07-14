import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminAboutPage from "@/app/(admin)/admin/about/page";
import { getSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac";
import { siteSettingsQueries } from "@/lib/server-queries";
import { redirect } from "next/navigation";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  roleHasPermission: vi.fn(),
}));

vi.mock("@/lib/server-queries", () => ({
  siteSettingsQueries: {
    getOrCreateDefault: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("Redirected");
  }),
}));

vi.mock("@/components/admin/about-editor-form", () => ({
  AboutEditorForm: () => <div data-testid="about-editor-form">about editor form</div>,
}));

const session = {
  user: { roleId: "role-1", email: "admin@example.com", permissions: ["admin:access", "settings:manage"] },
};

describe("Admin About Page (server gate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (siteSettingsQueries.getOrCreateDefault as any).mockResolvedValue({
      aboutTitle: null,
      aboutContent: null,
      aboutAllowRawHtml: false,
      aboutShowRawHtmlToc: false,
    });
  });

  it("renders the editor when the role currently holds settings:manage", async () => {
    (getSession as any).mockResolvedValue(session);
    (roleHasPermission as any).mockResolvedValue(true);

    const ui = await AdminAboutPage();
    render(ui);

    expect(screen.getByTestId("about-editor-form")).toBeInTheDocument();
    expect(roleHasPermission).toHaveBeenCalledWith("role-1", "settings:manage");
  });

  it("redirects when the role's settings:manage was revoked, even though the JWT session snapshot still lists it", async () => {
    // 模擬「已撤權但 session 仍有效」：JWT 快照裡的 permissions 仍含 settings:manage，
    // 但即時查庫（roleHasPermission）回傳 false，代表角色權限已被收回。
    (getSession as any).mockResolvedValue(session);
    (roleHasPermission as any).mockResolvedValue(false);

    await expect(AdminAboutPage()).rejects.toThrow("Redirected");

    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(siteSettingsQueries.getOrCreateDefault).not.toHaveBeenCalled();
  });

  it("redirects an unauthenticated visitor to login", async () => {
    (getSession as any).mockResolvedValue(null);

    await expect(AdminAboutPage()).rejects.toThrow("Redirected");

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("redirects a session without a roleId to /admin", async () => {
    (getSession as any).mockResolvedValue({ user: { email: "no-role@example.com" } });

    await expect(AdminAboutPage()).rejects.toThrow("Redirected");

    expect(redirect).toHaveBeenCalledWith("/admin");
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getSettings: vi.fn(),
  listActiveCategories: vi.fn(),
  sessionHasPermission: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: mocks.getSession,
}));

vi.mock("@/lib/rbac", () => ({
  sessionHasPermission: mocks.sessionHasPermission,
}));

vi.mock("@/lib/server-queries", () => ({
  postsQueries: {
    listActiveCategories: mocks.listActiveCategories,
  },
  siteSettingsQueries: {
    getDefault: mocks.getSettings,
  },
}));

vi.mock("@/components/navbar-client", () => ({
  NavbarClient: ({ navItems }: { navItems: Array<{ label: string }> }) => (
    <nav>{navItems.map((item) => <span key={item.label}>{item.label}</span>)}</nav>
  ),
}));

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      user: { roleId: "admin", email: "admin@example.com" },
    });
    mocks.getSettings.mockResolvedValue({ showBlogLink: false, showAbout: true });
    mocks.listActiveCategories.mockResolvedValue([]);
  });

  it("falls back to the default navigation when permission evaluation fails", async () => {
    mocks.sessionHasPermission.mockImplementation(() => {
      throw new Error("invalid permission payload");
    });

    const navbar = await Navbar();
    render(navbar);

    expect(screen.getByText("部落格")).toBeInTheDocument();
  });
});

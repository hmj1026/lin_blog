import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavbarClient } from "@/components/navbar-client";

// Mocks
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/components/logo", () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button>ThemeToggle</button>,
}));

const mockNavItems = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
];

const mockAdminUser = {
  email: "admin@example.com",
  roleName: "Administrator",
};

describe("NavbarClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders navigation items", () => {
    render(<NavbarClient navItems={mockNavItems} adminUser={null} />);
    expect(screen.getByTestId("logo")).toBeInTheDocument();
    expect(screen.getAllByText("Blog")[0]).toBeInTheDocument(); // Desktop and Mobile might both render, or hidden via css? 
    // The component renders desktop nav and mobile nav separately. Desktop is visible lg:flex. Mobile is in drawer?
    // Actually mobile menu is conditional on state `open`.
    // So initially only desktop nav items.
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("handles search submission", async () => {
    render(<NavbarClient navItems={mockNavItems} adminUser={null} />);
    
    const searchInput = screen.getByPlaceholderText("搜尋...");
    await userEvent.type(searchInput, "react");
    await userEvent.keyboard("{Enter}");

    expect(pushMock).toHaveBeenCalledWith("/search?q=react");
  });

  it("shows admin menu when logged in", async () => {
    // details element behavior in jsdom might act as open if attribute set, or we can just find elements if accessible
    render(<NavbarClient navItems={mockNavItems} adminUser={mockAdminUser} />);

    // Summary element is always visible (and dropdown content is in DOM)
    const emails = screen.getAllByText("admin@example.com");
    expect(emails.length).toBeGreaterThan(0);
    
    // Role label also appears twice (desktop summary, mobile menu?) 
    // Actually mobile menu not open, but dropdown content has it.
    const roles = screen.getAllByText("Administrator");
    expect(roles.length).toBeGreaterThan(0);

    // The dropdown content is inside details, strictly speaking visible in DOM but might need open attribute
    // User interaction: click summary
    // const summary = screen.getByText("Administrator").closest("summary");
    // await userEvent.click(summary!);
    
    // Check links in dropdown
    // Note: details element open state isn't strictly managed by react unless we implemented it that way?
    // Component uses native details.
    // JSDOM supports details toggle?
    
    // Let's check for existence of "登出" link
    expect(screen.getByText("登出")).toBeInTheDocument();
  });

  it("toggles mobile menu", async () => {
    render(<NavbarClient navItems={mockNavItems} adminUser={null} />);

    // Find toggle button (hidden on desktop)
    const toggleBtn = screen.getByLabelText("切換選單");
    await userEvent.click(toggleBtn);

    // Now mobile menu should be rendered
    // In mobile menu, we render nav items again
    // But how to distinguish?
    // Mobile menu wrapper has "lg:hidden".
    // We can check if "Blog" count increased?
    // Initial: 1 (Desktop). After open: 2 (Desktop + Mobile).
    expect(screen.getAllByText("Blog")).toHaveLength(2);
  });

  it("applies dark mode contrast classes to NavLink", () => {
    const { container } = render(<NavbarClient navItems={mockNavItems} adminUser={null} />);
    
    // Find nav links (desktop nav)
    const navLinks = container.querySelectorAll("nav a");
    expect(navLinks.length).toBeGreaterThan(0);
    
    // Check that inactive links have dark mode contrast classes with accent hover
    const blogLink = Array.from(navLinks).find(link => link.textContent === "Blog");
    expect(blogLink).toBeInTheDocument();
    // Inactive links should have dark:text-base-500 for better contrast
    expect(blogLink?.className).toContain("dark:text-base-500");
    expect(blogLink?.className).toContain("dark:hover:text-accent-400");
  });

  it("applies accent color to active NavLink", () => {
    // Home is active since usePathname returns "/"
    const { container } = render(<NavbarClient navItems={mockNavItems} adminUser={null} />);
    
    const navLinks = container.querySelectorAll("nav a");
    const homeLink = Array.from(navLinks).find(link => link.textContent === "Home");
    expect(homeLink).toBeInTheDocument();
    // Active links should have accent color and semibold
    expect(homeLink?.className).toContain("text-accent-600");
    expect(homeLink?.className).toContain("dark:text-accent-400");
    expect(homeLink?.className).toContain("font-semibold");
  });
});


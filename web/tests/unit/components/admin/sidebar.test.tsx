import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSidebar } from "@/components/admin/sidebar";

const defaultProps = {
  navigationGroups: [
    { label: "總覽", items: [{ href: "/admin", label: "儀表板" }] },
  ],
  account: { email: "admin@example.com", roleName: "管理員" },
};

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
}));

vi.mock("next/link", () => ({
  default: ({ children, href, onClick }: any) => (
    <a href={typeof href === "string" ? href : "#"} onClick={onClick}>
      {children}
    </a>
  ),
}));

describe("AdminSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the desktop sidebar navigation", () => {
    render(<AdminSidebar {...defaultProps} />);
    // 桌面側邊欄與抽屜共用導覽項目，桌面版預設即渲染
    expect(screen.getAllByRole("link", { name: "儀表板" }).length).toBeGreaterThan(0);
  });

  it("opens the drawer when the hamburger button is clicked", async () => {
    render(<AdminSidebar {...defaultProps} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "開啟導覽選單" }));
    expect(screen.getByRole("dialog", { name: "後台導覽選單" })).toBeInTheDocument();
  });

  it("closes the drawer on Escape and restores focus to the trigger", async () => {
    render(<AdminSidebar {...defaultProps} />);
    const trigger = screen.getByRole("button", { name: "開啟導覽選單" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes the drawer when the close button is clicked", async () => {
    render(<AdminSidebar {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "開啟導覽選單" }));
    await userEvent.click(screen.getByRole("button", { name: "關閉導覽選單" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders only destinations supplied by the permission-aware navigation DTO", () => {
    const SidebarWithDto = AdminSidebar as any;
    render(
      <SidebarWithDto
        navigationGroups={[
          {
            label: "內容管理",
            items: [
              { href: "/admin/posts", label: "文章列表" },
              { href: "/admin/media", label: "媒體庫" },
              { href: "/admin/import-export", label: "匯入／匯出" },
            ],
          },
        ]}
        account={{ email: "editor@example.com", roleName: "編輯" }}
      />
    );

    expect(screen.getByText("內容管理")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "媒體庫" })).toHaveAttribute("href", "/admin/media");
    expect(screen.getByRole("link", { name: "匯入／匯出" })).toHaveAttribute("href", "/admin/import-export");
    expect(screen.queryByRole("link", { name: "使用者管理" })).not.toBeInTheDocument();
  });

  it("shows the signed-in role and account identity", () => {
    const SidebarWithDto = AdminSidebar as any;
    render(
      <SidebarWithDto
        navigationGroups={[]}
        account={{ email: "analyst@example.com", roleName: "分析唯讀" }}
      />
    );

    expect(screen.getByText("分析唯讀")).toBeInTheDocument();
    expect(screen.getByText("analyst@example.com")).toBeInTheDocument();
  });

  it("shows About frontend activation separately from management access", () => {
    render(
      <AdminSidebar
        navigationGroups={[
          {
            label: "內容管理",
            items: [{ href: "/admin/about", label: "關於我", statusLabel: "前台未啟用" }],
          },
        ]}
        account={defaultProps.account}
      />
    );

    expect(screen.getByRole("link", { name: /關於我/ })).toHaveAttribute("href", "/admin/about");
    expect(screen.getByText("前台未啟用")).toBeInTheDocument();
  });
});

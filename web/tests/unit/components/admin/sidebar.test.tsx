import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSidebar } from "@/components/admin/sidebar";

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
    render(<AdminSidebar />);
    // 桌面側邊欄與抽屜共用導覽項目，桌面版預設即渲染
    expect(screen.getAllByRole("link", { name: "儀表板" }).length).toBeGreaterThan(0);
  });

  it("opens the drawer when the hamburger button is clicked", async () => {
    render(<AdminSidebar />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "開啟導覽選單" }));
    expect(screen.getByRole("dialog", { name: "後台導覽選單" })).toBeInTheDocument();
  });

  it("closes the drawer on Escape and restores focus to the trigger", async () => {
    render(<AdminSidebar />);
    const trigger = screen.getByRole("button", { name: "開啟導覽選單" });
    await userEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes the drawer when the close button is clicked", async () => {
    render(<AdminSidebar />);
    await userEvent.click(screen.getByRole("button", { name: "開啟導覽選單" }));
    await userEvent.click(screen.getByRole("button", { name: "關閉導覽選單" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

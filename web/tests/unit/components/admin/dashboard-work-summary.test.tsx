import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardWorkSummary } from "@/components/admin/dashboard-work-summary";

describe("DashboardWorkSummary", () => {
  it("顯示工作摘要、近期更新與成長／衰退排行", () => {
    render(<DashboardWorkSummary
      drafts={{ total: 4, items: [{ id: "p1", title: "草稿文章" }] }}
      scheduled={{ total: 2, items: [{ id: "p2", title: "排程文章" }] }}
      recent={[{ id: "p3", title: "近期更新" }]}
      performance={{ growth: [{ id: "p4", title: "成長文章", percentChange: 80 }], decline: [{ id: "p5", title: "衰退文章", percentChange: -25 }] }}
      shortcuts={[{ href: "/admin/posts/new", label: "新增文章" }]}
    />);

    expect(screen.getByText("4 篇草稿")).toBeInTheDocument();
    expect(screen.getByText("2 篇排程")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "近期更新" })).toBeInTheDocument();
    expect(screen.getByText("成長文章").closest("li")).toHaveTextContent("+80%");
    expect(screen.getByText("衰退文章").closest("li")).toHaveTextContent("-25%");
    expect(screen.getByRole("link", { name: "新增文章" })).toHaveAttribute("href", "/admin/posts/new");
  });

  it("只渲染已由伺服器授權的快捷操作", () => {
    render(<DashboardWorkSummary drafts={{ total: 0, items: [] }} scheduled={{ total: 0, items: [] }} recent={[]} performance={{ growth: [], decline: [] }} shortcuts={[{ href: "/admin/posts", label: "管理文章" }]} />);

    expect(screen.getByRole("link", { name: "管理文章" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "使用者管理" })).not.toBeInTheDocument();
    expect(screen.getByText("目前沒有待處理的草稿或排程文章")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PreviewPage from "@/app/(frontend)/preview/page";

describe("PreviewPage", () => {
  it("renders default view (Header schemes)", () => {
    render(<PreviewPage />);
    expect(screen.getByText("Dark Mode 配色方案預覽")).toBeInTheDocument();
    expect(screen.getByText("文章 Header")).toHaveClass("bg-accent-600"); // Active tab
    expect(screen.getByText("方案 A：透明融合 (Transparent Blend)")).toBeInTheDocument();
  });

  it("switches to Filter schemes tab", async () => {
    render(<PreviewPage />);
    
    const filterTab = screen.getByText("篩選卡片");
    await userEvent.click(filterTab);

    expect(screen.getByText("方案一：玻璃質感 (Glass Morphism)")).toBeInTheDocument();
    expect(screen.queryByText("方案 A：透明融合 (Transparent Blend)")).not.toBeInTheDocument();
  });

  it("interacts with filter scheme chips", async () => {
    render(<PreviewPage />);
    await userEvent.click(screen.getByText("篩選卡片"));

    // Find first scheme card
    const firstScheme = screen.getByText("方案一：玻璃質感 (Glass Morphism)").closest(".space-y-2");
    expect(firstScheme).not.toBeNull();

    const categoryBtn = within(firstScheme as HTMLElement).getByText("策略");
    await userEvent.click(categoryBtn);
    // Logic is local state, just verifying no crash and interaction works
  });
});

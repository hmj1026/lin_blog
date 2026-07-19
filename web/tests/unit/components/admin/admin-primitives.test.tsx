import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterBar } from "@/components/admin/filter-bar";

describe("admin UI primitives", () => {
  it("renders a page title, description and action", () => {
    render(
      <AdminPageHeader
        title="文章管理"
        description="搜尋、編輯與發布文章"
        actions={<button type="button">新增文章</button>}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "文章管理" })).toBeInTheDocument();
    expect(screen.getByText("搜尋、編輯與發布文章")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增文章" })).toBeInTheDocument();
  });

  it("announces an error and exposes a retry action", async () => {
    const retry = vi.fn();
    render(<AdminFeedback tone="error" message="載入失敗" onRetry={retry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("載入失敗");
    await userEvent.click(screen.getByRole("button", { name: "重試" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("restores focus after cancelling a confirmation", async () => {
    const user = userEvent.setup();

    /** 提供確認對話框開關與焦點還原的測試情境。 */
    function ConfirmationHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            刪除文章
          </button>
          <ConfirmationDialog
            open={open}
            title="確認刪除文章"
            description="文章會移至垃圾桶。"
            confirmLabel="確認刪除"
            onConfirm={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </>
      );
    }

    render(<ConfirmationHarness />);
    const trigger = screen.getByRole("button", { name: "刪除文章" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "確認刪除文章" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(trigger).toHaveFocus();
  });

  it("preserves the original trigger when pending state changes before Escape", async () => {
    const cancel = vi.fn();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const { rerender } = render(
      <ConfirmationDialog
        open
        pending
        title="確認刪除媒體"
        description="媒體將被刪除。"
        returnFocus={trigger}
        onConfirm={vi.fn()}
        onCancel={cancel}
      />
    );
    rerender(
      <ConfirmationDialog
        open
        pending={false}
        title="確認刪除媒體"
        description="媒體將被刪除。"
        returnFocus={trigger}
        onConfirm={vi.fn()}
        onCancel={cancel}
      />
    );

    await userEvent.keyboard("{Escape}");
    rerender(
      <ConfirmationDialog
        open={false}
        title="確認刪除媒體"
        description="媒體將被刪除。"
        returnFocus={trigger}
        onConfirm={vi.fn()}
        onCancel={cancel}
      />
    );

    expect(cancel).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("renders a labelled empty state action", () => {
    render(
      <EmptyState
        title="尚無文章"
        description="建立第一篇文章開始使用。"
        action={<button type="button">新增文章</button>}
      />
    );

    expect(screen.getByRole("status")).toHaveAccessibleName("尚無文章");
    expect(screen.getByRole("button", { name: "新增文章" })).toBeInTheDocument();
  });

  it("groups filters in a labelled search region", () => {
    render(
      <FilterBar ariaLabel="文章篩選">
        <label htmlFor="post-search">搜尋文章</label>
        <input id="post-search" />
      </FilterBar>
    );

    expect(screen.getByRole("search", { name: "文章篩選" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "搜尋文章" })).toBeInTheDocument();
  });

  it("keeps a wide admin table keyboard-scrollable at narrow widths", () => {
    render(
      <AdminDataTable ariaLabel="文章列表">
        <thead>
          <tr>
            <th>標題</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>第一篇</td>
            <td>
              <button type="button">編輯</button>
            </td>
          </tr>
        </tbody>
      </AdminDataTable>
    );

    const region = screen.getByRole("region", { name: "文章列表" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("button", { name: "編輯" })).toBeInTheDocument();
  });
});

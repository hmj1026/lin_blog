import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { AdminFeedback } from "@/components/admin/admin-feedback";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";

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

  it("traps Tab focus inside the dialog while open", async () => {
    // aria-modal 對話框開啟時，Tab 循環不得逃到背景控制項。
    const outside = document.createElement("button");
    outside.textContent = "outside";
    document.body.appendChild(outside);

    render(
      <ConfirmationDialog
        open
        title="確認刪除媒體"
        description="媒體將被刪除。"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    const cancelButton = screen.getByRole("button", { name: "取消" });
    const confirmButton = screen.getByRole("button", { name: "確認" });

    confirmButton.focus();
    await userEvent.keyboard("{Tab}");
    expect(cancelButton).toHaveFocus();

    cancelButton.focus();
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
    expect(confirmButton).toHaveFocus();

    outside.remove();
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryAdminClient } from "@/components/admin/category-admin-client";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockCategories = [
  { id: "1", slug: "tech", name: "Technology", showInNav: true, navOrder: 1, deletedAt: null },
];

describe("CategoryAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("renders categories", () => {
    render(<CategoryAdminClient initialCategories={mockCategories} />);
    expect(screen.getByDisplayValue("Technology")).toBeInTheDocument();
    expect(screen.getByDisplayValue("tech")).toBeInTheDocument();
  });

  it("creates a new category", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "2", slug: "life", name: "Life", showInNav: false, navOrder: 0, deletedAt: null },
      }),
    });

    render(<CategoryAdminClient initialCategories={mockCategories} />);

    // Fill new category form
    const nameInput = screen.getByPlaceholderText("名稱（例如：策略）");
    const slugInput = screen.getByPlaceholderText("slug（例如：策略）");
    await userEvent.type(nameInput, "Life");
    await userEvent.type(slugInput, "life");

    // Click create
    const createBtn = screen.getByRole("button", { name: "新增" });
    await userEvent.click(createBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/categories", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"name":"Life"'),
    }));

     await waitFor(() => {
      expect(screen.getByText("已新增")).toBeInTheDocument();
      // Input is cleared, so only the row has "Life"
      expect(screen.getAllByDisplayValue("Life")).toHaveLength(1);
      
      // Verify input is cleared
      expect(nameInput).toHaveValue("");
    });
  });

  it("updates a category", async () => {
     fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "1", slug: "tech-updated", name: "Technology Updated", showInNav: true, navOrder: 2, deletedAt: null },
      }),
    });

    render(<CategoryAdminClient initialCategories={mockCategories} />);

    const row = screen.getByDisplayValue("Technology").closest("tr");
    expect(row).not.toBeNull();

    const nameInput = within(row as HTMLElement).getByDisplayValue("Technology");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Technology Updated");

    const saveBtn = within(row as HTMLElement).getByText("儲存");
    await userEvent.click(saveBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/categories/1", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("Technology Updated"),
    }));

    await waitFor(() => {
        expect(screen.getByText("已更新")).toBeInTheDocument();
    });
  });

  it("deletes a category", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<CategoryAdminClient initialCategories={mockCategories} />);

    const row = screen.getByDisplayValue("Technology").closest("tr");
    const deleteBtn = within(row as HTMLElement).getByText("刪除");
    await userEvent.click(deleteBtn);

     expect(fetchMock).toHaveBeenCalledWith("/api/categories/1", expect.objectContaining({
      method: "DELETE"
    }));

    await waitFor(() => {
      // It uses soft delete and filtering in `activeRows`
      expect(screen.queryByDisplayValue("Technology")).not.toBeInTheDocument();
    });
  });
});

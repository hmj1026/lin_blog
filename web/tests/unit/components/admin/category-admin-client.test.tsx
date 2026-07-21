import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryAdminClient } from "@/components/admin/category-admin-client";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockCategories = [
  { id: "1", slug: "tech", name: "Technology", showInNav: true, navOrder: 1, postCount: 5, deletedAt: null },
  { id: "2", slug: "life", name: "Life", showInNav: false, navOrder: 2, postCount: 1, deletedAt: null },
  { id: "3", slug: "old", name: "Old", showInNav: false, navOrder: 3, postCount: 0, deletedAt: "2026-01-01T00:00:00.000Z" },
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
    expect(screen.getByText("5 篇文章")).toBeInTheDocument();
  });

  it("searches, sorts by usage and restores from trash", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { id: "3" } }) });
    render(<CategoryAdminClient initialCategories={mockCategories} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "搜尋分類" }), "Life");
    expect(screen.queryByDisplayValue("Technology")).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole("searchbox", { name: "搜尋分類" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "分類排序" }), "usage-desc");
    expect(within(screen.getAllByRole("row")[1]).getByDisplayValue("Technology")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "垃圾桶" }));
    await userEvent.click(screen.getByRole("button", { name: "復原 Old" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/categories/3", expect.objectContaining({ method: "PATCH" }));
  });

  it("confirms safe merge and names the target", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { id: "1", movedPosts: 5 } }) });
    render(<CategoryAdminClient initialCategories={mockCategories} />);
    const row = screen.getByDisplayValue("Technology").closest("tr") as HTMLElement;
    await userEvent.selectOptions(within(row).getByRole("combobox", { name: "Technology 合併目標" }), "2");
    await userEvent.click(within(row).getByRole("button", { name: "合併 Technology" }));
    expect(screen.getByRole("dialog", { name: "確認合併分類" })).toHaveTextContent("Life");
    await userEvent.click(screen.getByRole("button", { name: "確認合併" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/categories/1", expect.objectContaining({ body: JSON.stringify({ mergeIntoId: "2" }) }));
  });

  it("合併分類失敗時仍會關閉確認對話框並顯示錯誤", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ success: false, message: "合併失敗，請稍後再試" }) });
    render(<CategoryAdminClient initialCategories={mockCategories} />);
    const row = screen.getByDisplayValue("Technology").closest("tr") as HTMLElement;
    await userEvent.selectOptions(within(row).getByRole("combobox", { name: "Technology 合併目標" }), "2");
    await userEvent.click(within(row).getByRole("button", { name: "合併 Technology" }));
    expect(screen.getByRole("dialog", { name: "確認合併分類" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "確認合併" }));

    expect(await screen.findByText("合併失敗，請稍後再試")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "確認合併分類" })).not.toBeInTheDocument();
  });

  it("creates a new category", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "4", slug: "culture", name: "Culture", showInNav: false, navOrder: 0, deletedAt: null },
      }),
    });

    render(<CategoryAdminClient initialCategories={mockCategories} />);

    // Fill new category form
    const nameInput = screen.getByPlaceholderText("名稱（例如：策略）");
    const slugInput = screen.getByPlaceholderText("slug（例如：策略）");
    await userEvent.type(nameInput, "Culture");
    await userEvent.type(slugInput, "culture");

    // Click create
    const createBtn = screen.getByRole("button", { name: "新增" });
    await userEvent.click(createBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/categories", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"name":"Culture"'),
    }));

     await waitFor(() => {
      expect(screen.getByText("已新增")).toBeInTheDocument();
      // Input is cleared, so only the row has "Life"
      expect(screen.getAllByDisplayValue("Culture")).toHaveLength(1);
      
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
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { affectedPosts: 3 } }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: "1", affectedPosts: 3 } }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { id: "1" } }),
    });

    render(<CategoryAdminClient initialCategories={mockCategories} />);

    const row = screen.getByDisplayValue("Technology").closest("tr");
    const deleteBtn = within(row as HTMLElement).getByText("刪除");
    await userEvent.click(deleteBtn);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/categories/1", expect.objectContaining({
      method: "GET"
    }));
    expect(await screen.findByText(/3 篇文章/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "確認刪除" }));

    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/categories/1", expect.objectContaining({
      method: "DELETE"
    }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Technology")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("3 篇文章仍會保留");
    });

    await userEvent.click(screen.getByRole("button", { name: "復原" }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/categories/1", expect.objectContaining({
      method: "PATCH"
    }));
    expect(await screen.findByDisplayValue("Technology")).toBeInTheDocument();
  });

  it("刪除分類失敗時仍會關閉確認對話框並顯示錯誤", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { affectedPosts: 3 } }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: "刪除失敗，請稍後再試" }),
    });

    render(<CategoryAdminClient initialCategories={mockCategories} />);
    const row = screen.getByDisplayValue("Technology").closest("tr");
    await userEvent.click(within(row as HTMLElement).getByText("刪除"));
    expect(await screen.findByText(/3 篇文章/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "確認刪除" }));

    expect(await screen.findByText("刪除失敗，請稍後再試")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "確認刪除分類" })).not.toBeInTheDocument();
  });
});

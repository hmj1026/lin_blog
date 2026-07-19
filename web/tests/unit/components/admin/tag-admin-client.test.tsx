import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagAdminClient } from "@/components/admin/tag-admin-client";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockTags = [
  { id: "1", slug: "react", name: "React", postCount: 8, deletedAt: null },
  { id: "2", slug: "next", name: "Next", postCount: 3, deletedAt: null },
  { id: "3", slug: "old", name: "Old", postCount: 0, deletedAt: "2026-01-01T00:00:00.000Z" },
];

describe("TagAdminClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("renders tags", () => {
    render(<TagAdminClient initialTags={mockTags} />);
    expect(screen.getByDisplayValue("React")).toBeInTheDocument();
    expect(screen.getByDisplayValue("react")).toBeInTheDocument();
    expect(screen.getByText("8 篇文章")).toBeInTheDocument();
  });

  it("supports search, usage sorting and trash restore", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { id: "3" } }) });
    render(<TagAdminClient initialTags={mockTags} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "搜尋標籤" }), "Next");
    expect(screen.queryByDisplayValue("React")).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole("searchbox", { name: "搜尋標籤" }));
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "標籤排序" }), "usage-desc");
    expect(within(screen.getAllByRole("row")[1]).getByDisplayValue("React")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "垃圾桶" }));
    await userEvent.click(screen.getByRole("button", { name: "復原 Old" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/tags/3", expect.objectContaining({ method: "PATCH" }));
  });

  it("requires confirmation before merging", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { id: "1", movedPosts: 8 } }) });
    render(<TagAdminClient initialTags={mockTags} />);
    const row = screen.getByDisplayValue("React").closest("tr") as HTMLElement;
    await userEvent.selectOptions(within(row).getByRole("combobox", { name: "React 合併目標" }), "2");
    await userEvent.click(within(row).getByRole("button", { name: "合併 React" }));
    await userEvent.click(screen.getByRole("button", { name: "確認合併" }));
    expect(fetchMock).toHaveBeenCalledWith("/api/tags/1", expect.objectContaining({ body: JSON.stringify({ mergeIntoId: "2" }) }));
  });

  it("creates a new tag", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "4", slug: "vue", name: "Vue", deletedAt: null },
      }),
    });

    render(<TagAdminClient initialTags={mockTags} />);

    // Fill new tag form
    const nameInput = screen.getByPlaceholderText("名稱（例如：Growth）");
    const slugInput = screen.getByPlaceholderText("slug（例如：growth）");
    await userEvent.type(nameInput, "Vue");
    await userEvent.type(slugInput, "vue");

    // Click create
    const createBtn = screen.getByRole("button", { name: "新增" });
    await userEvent.click(createBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/tags", expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"name":"Vue"'),
    }));

     await waitFor(() => {
      expect(screen.getByText("已新增")).toBeInTheDocument();
      // Input cleared logic same as Category
      expect(screen.getAllByDisplayValue("Vue")).toHaveLength(1);
      expect(nameInput).toHaveValue("");
    });
  });

  it("updates a tag", async () => {
     fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "1", slug: "react-js", name: "React JS", deletedAt: null },
      }),
    });

    render(<TagAdminClient initialTags={mockTags} />);

    const row = screen.getByDisplayValue("React").closest("tr");
    expect(row).not.toBeNull();

    const nameInput = within(row as HTMLElement).getByDisplayValue("React");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "React JS");

    const saveBtn = within(row as HTMLElement).getByText("儲存");
    await userEvent.click(saveBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/tags/1", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("React JS"),
    }));

    await waitFor(() => {
        expect(screen.getByText("已更新")).toBeInTheDocument();
    });
  });

  it("deletes a tag", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<TagAdminClient initialTags={mockTags} />);

    const row = screen.getByDisplayValue("React").closest("tr");
    const deleteBtn = within(row as HTMLElement).getByText("刪除");
    await userEvent.click(deleteBtn);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "確認刪除標籤" })).toBeInTheDocument();
    expect(within(screen.getByRole("dialog", { name: "確認刪除標籤" })).getByText(/React/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "確認刪除" }));

     expect(fetchMock).toHaveBeenCalledWith("/api/tags/1", expect.objectContaining({
      method: "DELETE"
    }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("React")).not.toBeInTheDocument();
    });
  });
});

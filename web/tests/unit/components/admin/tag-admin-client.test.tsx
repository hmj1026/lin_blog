import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagAdminClient } from "@/components/admin/tag-admin-client";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockTags = [
  { id: "1", slug: "react", name: "React", deletedAt: null },
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
  });

  it("creates a new tag", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "2", slug: "vue", name: "Vue", deletedAt: null },
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

     expect(fetchMock).toHaveBeenCalledWith("/api/tags/1", expect.objectContaining({
      method: "DELETE"
    }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("React")).not.toBeInTheDocument();
    });
  });
});

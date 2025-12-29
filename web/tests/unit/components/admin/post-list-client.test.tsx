import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PostListClient } from "@/components/admin/post-list-client";

// Mocks
const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
    push: vi.fn(),
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// Mock confirm and alert
const confirmMock = vi.fn();
const alertMock = vi.fn();
vi.stubGlobal("confirm", confirmMock);
vi.stubGlobal("alert", alertMock);

const mockPosts = [
  {
    id: "1",
    slug: "post-one",
    title: "Post One",
    status: "PUBLISHED",
    featured: true,
    updatedAt: "2023-01-01T10:00:00Z",
    publishedAt: "2023-01-01T09:00:00Z",
    categories: [{ name: "Tech" }],
    tags: [{ name: "React" }],
  },
  {
    id: "2",
    slug: "post-two",
    title: "Post Two",
    status: "DRAFT",
    featured: false,
    updatedAt: "2023-01-02T10:00:00Z",
    publishedAt: null,
    categories: [],
    tags: [],
  },
];

describe("PostListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    confirmMock.mockReturnValue(true); // Default confirm true
  });

  it("renders posts", () => {
    render(<PostListClient posts={mockPosts as any} />);
    expect(screen.getByText("Post One")).toBeInTheDocument();
    expect(screen.getByText("Post Two")).toBeInTheDocument();
    expect(screen.getByText("已發佈")).toBeInTheDocument();
    expect(screen.getByText("草稿")).toBeInTheDocument();
  });

  it("displays published date for published posts and '未發布' for drafts", () => {
    render(<PostListClient posts={mockPosts as any} />);
    // 已發布文章應顯示發布時間
    expect(screen.getByText("發布時間")).toBeInTheDocument(); // 欄位標題
    expect(screen.getByText(/2023-01-01 17:00/)).toBeInTheDocument(); // UTC+8
    // 草稿文章應顯示「未發布」
    expect(screen.getByText("未發布")).toBeInTheDocument();
  });

  it("filters posts by title", async () => {
    render(<PostListClient posts={mockPosts as any} />);
    
    const searchInput = screen.getByPlaceholderText("搜尋文章標題...");
    await userEvent.type(searchInput, "One");

    expect(screen.getByText("Post One")).toBeInTheDocument();
    expect(screen.queryByText("Post Two")).not.toBeInTheDocument();
  });

  it("handles selection", async () => {
    render(<PostListClient posts={mockPosts as any} />);

    // Select all
    // First checkbox in thead
    const selectAllCheckbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(selectAllCheckbox);

    // Verify both row checkboxes checked
    const checkboxes = screen.getAllByRole("checkbox"); // 3 checkboxes total
    expect(checkboxes[1]).toBeChecked(); // Row 1
    expect(checkboxes[2]).toBeChecked(); // Row 2
    
    expect(screen.getByText("已選取 2 篇文章")).toBeInTheDocument();

    // Deselect one
    await userEvent.click(checkboxes[1]);
    expect(screen.getByText("已選取 1 篇文章")).toBeInTheDocument();
  });

  it("handles batch actions (publish)", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<PostListClient posts={mockPosts as any} />);

    // Select Post Two
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[2]); // Post Two

    // Click Publish
    const publishBtn = screen.getByText("批次發佈");
    await userEvent.click(publishBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/posts/batch", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"action":"publish"'),
    }));
    // body should contain postIds: ["2"]
    expect(fetchMock).toHaveBeenCalledWith("/api/posts/batch", expect.objectContaining({
       body: expect.stringContaining('"postIds":["2"]')
    }));

    await waitFor(() => {
        expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("handles batch delete with confirmation", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<PostListClient posts={mockPosts as any} />);

    // Select Post One
    const checkboxes = screen.getAllByRole("checkbox");
    await userEvent.click(checkboxes[1]);

    // Click Delete
    const deleteBtn = screen.getByText("批次刪除");
    await userEvent.click(deleteBtn);

    expect(confirmMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/posts/batch", expect.objectContaining({
      body: expect.stringContaining('"action":"delete"')
    }));
  });

  it("toggles featured status", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<PostListClient posts={mockPosts as any} />);

    // Post One is featured (btn text ★, title "取消精選")
    // Use title to find button
    const starBtn = screen.getByTitle("取消精選");
    await userEvent.click(starBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/posts/1", expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"featured":false')
    }));
  });

  it("renders preview button for each post", () => {
    render(<PostListClient posts={mockPosts as any} />);

    // Each post should have a preview button
    const previewButtons = screen.getAllByText("預覽");
    expect(previewButtons).toHaveLength(mockPosts.length);
  });

  it("opens preview in new tab with correct URL", async () => {
    const openMock = vi.fn();
    vi.stubGlobal("open", openMock);

    render(<PostListClient posts={mockPosts as any} />);

    const previewButtons = screen.getAllByText("預覽");
    await userEvent.click(previewButtons[0]);

    expect(openMock).toHaveBeenCalledWith(
      "/blog/post-one?preview=1",
      "_blank",
      "noopener,noreferrer"
    );
  });
});

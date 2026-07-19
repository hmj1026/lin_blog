import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  });

  it("renders posts", () => {
    render(<PostListClient posts={mockPosts as any} />);
    expect(screen.getByText("Post One")).toBeInTheDocument();
    expect(screen.getByText("Post Two")).toBeInTheDocument();
    expect(screen.getAllByText("已發佈").length).toBeGreaterThan(0);
    expect(screen.getAllByText("草稿").length).toBeGreaterThan(0);
  });

  it("displays published date for published posts and '未發布' for drafts", () => {
    render(<PostListClient posts={mockPosts as any} />);
    // 已發布文章應顯示發布時間
    expect(screen.getByText("發布時間")).toBeInTheDocument(); // 欄位標題
    // 發布和更新時間都會顯示日期，用 getAllByText 匹配
    // 避免時區差異問題 (CI 使用 UTC，本地可能用 UTC+8)
    const dateElements = screen.getAllByText(/2023-01-0[12] \d{2}:00:\d{2}/);
    expect(dateElements.length).toBeGreaterThan(0);
    // 草稿文章應顯示「未發布」
    expect(screen.getByText("未發布")).toBeInTheDocument();
  });

  it("uses a GET form so search and filters remain URL-driven", async () => {
    render(<PostListClient posts={mockPosts as any} />);

    const searchInput = screen.getByRole("searchbox", { name: "搜尋文章" });
    await userEvent.type(searchInput, "One");
    expect(searchInput).toHaveAttribute("name", "q");
    expect(screen.getByRole("form", { name: "文章篩選" })).toHaveAttribute("method", "get");
    expect(screen.getByText("Post One")).toBeInTheDocument();
    expect(screen.getByText("Post Two")).toBeInTheDocument();
  });

  it("offers category, tag, featured and sort filters", () => {
    render(
      <PostListClient
        posts={mockPosts as any}
        categories={[{ id: "category-1", name: "產品" }]}
        tags={[{ id: "tag-1", name: "UX" }]}
      />
    );

    expect(screen.getByRole("combobox", { name: "分類" })).toHaveAttribute("name", "category");
    expect(screen.getByRole("combobox", { name: "標籤" })).toHaveAttribute("name", "tag");
    expect(screen.getByRole("combobox", { name: "精選" })).toHaveAttribute("name", "featured");
    expect(screen.getByRole("combobox", { name: "排序" })).toHaveAttribute("name", "sort");
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

  it("clears selection when the URL-driven result set changes", async () => {
    const { rerender } = render(<PostListClient posts={mockPosts as any} selectionKey="page-1" />);
    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    expect(screen.getByText("已選取 1 篇文章")).toBeInTheDocument();

    rerender(<PostListClient posts={mockPosts as any} selectionKey="page-2" />);

    expect(screen.queryByText("已選取 1 篇文章")).not.toBeInTheDocument();
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

    expect(fetchMock).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "確認批次刪除文章" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/1 篇文章/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "確認刪除" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/posts/batch", expect.objectContaining({
      body: expect.stringContaining('"action":"delete"')
    }));
  });

  it("shows batch action errors in an accessible alert", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: "批次操作被拒絕" }),
    });

    render(<PostListClient posts={mockPosts as any} />);

    await userEvent.click(screen.getAllByRole("checkbox")[1]);
    await userEvent.click(screen.getByText("批次發佈"));

    expect(await screen.findByRole("alert")).toHaveTextContent("批次操作被拒絕");
  });

  it("keeps failed batch items selected and reports the partial result", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        count: 1,
        results: [{ id: "1", ok: true }, { id: "2", ok: false }],
      }),
    });
    render(<PostListClient posts={mockPosts as any} />);

    await userEvent.click(screen.getByRole("checkbox", { name: "選取目前篩選的全部文章" }));
    await userEvent.click(screen.getByText("批次發佈"));

    expect(await screen.findByText("成功 1 篇，失敗 1 篇；失敗項目仍保持選取。")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "選取文章「Post One」" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "選取文章「Post Two」" })).toBeChecked();
  });

  it("restores a post from the trash view", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(
      <PostListClient
        posts={[{ ...mockPosts[0], deletedAt: "2026-01-01T00:00:00.000Z" }] as any}
        filters={{ deleted: true, sort: "updated-desc", page: 1, pageSize: 20 }}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "復原" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/posts/1", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ restore: true }),
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
    const starBtn = screen.getByRole("button", { name: "取消精選「Post One」" });
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
      "/api/preview?slug=post-one",
      "_blank",
      "noopener,noreferrer"
    );
  });
});

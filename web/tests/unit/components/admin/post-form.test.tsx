import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminPostForm } from "@/components/admin/post-form";

// Mocks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/components/admin/tiptap-editor", () => ({
  TiptapEditor: ({ value, onChange }: any) => (
    <textarea
      data-testid="tiptap-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/components/admin/post-form/cover-uploader", () => ({
  CoverUploader: ({ onCoverChange }: any) => (
    <button onClick={() => onCoverChange("new-cover.jpg")}>Upload Cover</button>
  ),
}));

vi.mock("@/components/admin/post-form/preview-modal", () => ({
  PreviewModal: ({ onClose }: any) => (
    <div data-testid="preview-modal">
      Preview
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockInitial = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  status: "DRAFT" as const,
  featured: false,
  categoryIds: [],
  tagIds: [],
};

const mockCategories = [{ id: "cat1", name: "Tech", slug: "tech" }];
const mockTags = [{ id: "tag1", name: "React", slug: "react" }];

describe("AdminPostForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("renders create form", () => {
    render(
      <AdminPostForm
        mode="create"
        initial={mockInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );
    expect(screen.getByText("新增文章")).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    render(
      <AdminPostForm
        mode="create"
        initial={mockInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );

    // Button should be disabled initially (canSubmit check)
    expect(screen.getByRole("button", { name: "儲存" })).toBeDisabled();

    // Fill Title
    await userEvent.type(screen.getByLabelText("標題"), "My Title");
    // Verify slug auto-generation
    expect(screen.getByLabelText("Slug（網址）")).toHaveValue("my-title");

    // Fill Excerpt
    await userEvent.type(screen.getByLabelText("摘要"), "My Excerpt");

    // Fill Content
    await userEvent.type(screen.getByTestId("tiptap-editor"), "<p>Content</p>");
    
    // Check if button enabled
    await waitFor(() => {
        expect(screen.getByRole("button", { name: "儲存" })).toBeEnabled();
    });
  });

  it("submits create form", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <AdminPostForm
        mode="create"
        initial={mockInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );

    // Fill all required
    await userEvent.type(screen.getByLabelText("標題"), "My Title");
    await userEvent.type(screen.getByLabelText("摘要"), "My Excerpt");
    await userEvent.type(screen.getByTestId("tiptap-editor"), "<p>Content</p>");

    const saveButton = screen.getByRole("button", { name: "儲存" });
    await userEvent.click(saveButton);

    expect(fetchMock).toHaveBeenCalledWith("/api/posts", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("My Title"),
    }));
  });

  it("submits edit form", async () => {
     fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const editInitial = { ...mockInitial, title: "Old Title", slug: "old", content: "Old", excerpt: "Old" };

    render(
      <AdminPostForm
        mode="edit"
        postId="123"
        initial={editInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );

    expect(screen.getByDisplayValue("Old Title")).toBeInTheDocument();
    
    // Update title
    const titleInput = screen.getByLabelText("標題");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "New Title");

    // Click save
    await userEvent.click(screen.getByRole("button", { name: "儲存" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/posts/123", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("New Title"),
    }));
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  allowRawHtml: false,
  categoryIds: [],
  tagIds: [],
  coverImage: null,
  readingTime: null,
  publishedAt: null,
  seoTitle: null,
  seoDescription: null,
  seoKeywords: null,
  ogImage: null,
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

  it("defaults showRawHtmlToc to false in the create submit payload", async () => {
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

    await userEvent.type(screen.getByLabelText("標題"), "My Title");
    await userEvent.type(screen.getByLabelText("摘要"), "My Excerpt");
    await userEvent.type(screen.getByTestId("tiptap-editor"), "<p>Content</p>");

    const saveButton = screen.getByRole("button", { name: "儲存" });
    await userEvent.click(saveButton);

    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call?.[1]?.body as string);
    expect(body.showRawHtmlToc).toBe(false);
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

  it("reflects a loaded showRawHtmlToc=true value in the edit submit payload", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    const editInitial = {
      ...mockInitial,
      title: "Old Title",
      slug: "old",
      content: "Old",
      excerpt: "Old",
      showRawHtmlToc: true,
    };

    render(
      <AdminPostForm
        mode="edit"
        postId="123"
        initial={editInitial as any}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: "儲存" }));

    const call = fetchMock.mock.calls[0];
    const body = JSON.parse(call?.[1]?.body as string);
    expect(body.showRawHtmlToc).toBe(true);
  });

  it("toggles to a raw HTML textarea and shows the risk warning", async () => {
    render(
      <AdminPostForm
        mode="create"
        initial={mockInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );
    // 預設為 TipTap 編輯器
    expect(screen.getByTestId("tiptap-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("raw-html-editor")).not.toBeInTheDocument();

    // 開啟原始 HTML 模式（透過互斥的模式選擇器）
    await userEvent.click(screen.getByRole("radio", { name: "原始 HTML" }));

    expect(screen.getByTestId("raw-html-editor")).toBeInTheDocument();
    expect(screen.queryByTestId("tiptap-editor")).not.toBeInTheDocument();
    // 顯示風險提示（以隔離 iframe 相關文字判定，避免與開關標籤文字衝突）
    expect(screen.getByText(/隔離 iframe/)).toBeInTheDocument();
  });

  it("shows amber warning banner + switch button when normal mode content has rich HTML", async () => {
    render(
      <AdminPostForm
        mode="create"
        initial={mockInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );

    await userEvent.type(
      screen.getByTestId("tiptap-editor"),
      '<div style="color:red">x</div>'
    );

    expect(screen.getByTestId("rich-html-warning")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "切換為原始 HTML 模式" })
    ).toBeInTheDocument();
  });

  it("does not show the banner for pure WYSIWYG content", async () => {
    render(
      <AdminPostForm
        mode="create"
        initial={mockInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );

    await userEvent.type(screen.getByTestId("tiptap-editor"), "<p>hello</p>");

    expect(screen.queryByTestId("rich-html-warning")).not.toBeInTheDocument();
  });

  it("clicking the switch button turns on raw HTML mode", async () => {
    render(
      <AdminPostForm
        mode="create"
        initial={mockInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );

    await userEvent.type(
      screen.getByTestId("tiptap-editor"),
      '<div style="color:red">x</div>'
    );

    expect(screen.getByTestId("rich-html-warning")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "切換為原始 HTML 模式" })
    );

    expect(screen.getByTestId("raw-html-editor")).toBeInTheDocument();
  });

  it("submitting rich HTML in normal mode prompts confirm and cancel aborts save", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    render(
      <AdminPostForm
        mode="create"
        initial={mockInitial}
        categories={mockCategories as any}
        tags={mockTags as any}
      />
    );

    await userEvent.type(screen.getByLabelText("標題"), "My Title");
    await userEvent.type(screen.getByLabelText("摘要"), "My Excerpt");
    await userEvent.type(
      screen.getByTestId("tiptap-editor"),
      '<div style="color:red">x</div>'
    );

    const saveButton = screen.getByRole("button", { name: "儲存" });
    await waitFor(() => {
      expect(saveButton).toBeEnabled();
    });
    await userEvent.click(saveButton);

    expect(confirmSpy).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  describe("dirty-form preview flow", () => {
    function renderEditForm() {
      const editInitial = {
        ...mockInitial,
        title: "Old Title",
        slug: "old",
        content: "Old",
        excerpt: "Old",
      };
      return render(
        <AdminPostForm
          mode="edit"
          postId="123"
          initial={editInitial}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );
    }

    it("opens the preview modal directly when the form is clean", async () => {
      renderEditForm();

      await userEvent.click(screen.getByRole("button", { name: "預覽" }));

      expect(screen.getByTestId("preview-modal")).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("shows a save-first prompt instead of the preview modal when the form is dirty", async () => {
      renderEditForm();

      const titleInput = screen.getByLabelText("標題");
      await userEvent.type(titleInput, " Edited");

      await userEvent.click(screen.getByRole("button", { name: "預覽" }));

      expect(screen.queryByTestId("preview-modal")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "儲存並預覽" })
      ).toBeInTheDocument();
    });

    it("saves then opens the preview modal on 儲存並預覽 success", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderEditForm();

      const titleInput = screen.getByLabelText("標題");
      await userEvent.type(titleInput, " Edited");

      await userEvent.click(screen.getByRole("button", { name: "預覽" }));
      await userEvent.click(
        screen.getByRole("button", { name: "儲存並預覽" })
      );

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/posts/123",
          expect.objectContaining({ method: "PUT" })
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId("preview-modal")).toBeInTheDocument();
      });
    });

    it("keeps form content and shows the error without opening preview on 儲存並預覽 failure", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: "儲存失敗了" }),
      });

      renderEditForm();

      const titleInput = screen.getByLabelText("標題");
      await userEvent.type(titleInput, " Edited");

      await userEvent.click(screen.getByRole("button", { name: "預覽" }));
      await userEvent.click(
        screen.getByRole("button", { name: "儲存並預覽" })
      );

      await waitFor(() => {
        expect(screen.getByText("儲存失敗了")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("preview-modal")).not.toBeInTheDocument();
      expect(titleInput).toHaveValue("Old Title Edited");
    });
  });

  describe("authoring mode selector (4.1)", () => {
    it("renders mutually exclusive visual/raw options where selecting one deselects the other", async () => {
      render(
        <AdminPostForm
          mode="create"
          initial={mockInitial}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      const visualOption = screen.getByRole("radio", { name: "視覺編輯器" });
      const rawOption = screen.getByRole("radio", { name: "原始 HTML" });

      expect(visualOption).toBeChecked();
      expect(rawOption).not.toBeChecked();

      await userEvent.click(rawOption);

      expect(rawOption).toBeChecked();
      expect(visualOption).not.toBeChecked();
    });

    it("each mode option has a visible text label and a hit target at least 44px tall", () => {
      render(
        <AdminPostForm
          mode="create"
          initial={mockInitial}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      const visualLabel = screen.getByText("視覺編輯器").closest("label");
      const rawLabel = screen.getByText("原始 HTML").closest("label");
      expect(visualLabel?.className).toMatch(/min-h-\[44px\]/);
      expect(rawLabel?.className).toMatch(/min-h-\[44px\]/);
    });

    it("both mode options are keyboard-focusable and arrow-key navigable within the radiogroup", async () => {
      render(
        <AdminPostForm
          mode="create"
          initial={mockInitial}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      const visualOption = screen.getByRole("radio", { name: "視覺編輯器" });
      const rawOption = screen.getByRole("radio", { name: "原始 HTML" });

      visualOption.focus();
      expect(document.activeElement).toBe(visualOption);

      await userEvent.keyboard("{ArrowRight}");
      expect(document.activeElement).toBe(rawOption);
      expect(rawOption).toBeChecked();
    });
  });

  describe("raw HTML TOC control (4.4/4.5)", () => {
    it("hides the TOC control in visual mode and defaults it off for a new post", async () => {
      render(
        <AdminPostForm
          mode="create"
          initial={mockInitial}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      expect(screen.queryByLabelText("顯示系統自動目錄")).not.toBeInTheDocument();

      await userEvent.click(screen.getByRole("radio", { name: "原始 HTML" }));

      expect(screen.getByLabelText("顯示系統自動目錄")).not.toBeChecked();
    });

    it("shows a description mentioning the author can provide their own TOC", async () => {
      render(
        <AdminPostForm
          mode="create"
          initial={mockInitial}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      await userEvent.click(screen.getByRole("radio", { name: "原始 HTML" }));

      expect(screen.getByText(/自行.*目錄/)).toBeInTheDocument();
    });

    it("shows the TOC control checked in edit mode when initial.showRawHtmlToc is true and submits it", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const editInitial = {
        ...mockInitial,
        title: "Old Title",
        slug: "old",
        content: "Old",
        excerpt: "Old",
        allowRawHtml: true,
        showRawHtmlToc: true,
      };

      render(
        <AdminPostForm
          mode="edit"
          postId="123"
          initial={editInitial as any}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      const tocCheckbox = screen.getByLabelText("顯示系統自動目錄");
      expect(tocCheckbox).toBeChecked();

      await userEvent.click(screen.getByRole("button", { name: "儲存" }));

      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body as string);
      expect(body.showRawHtmlToc).toBe(true);
    });

    it("toggling the TOC control in raw mode changes the submit payload", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const editInitial = {
        ...mockInitial,
        title: "Old Title",
        slug: "old",
        content: "Old",
        excerpt: "Old",
        allowRawHtml: true,
        showRawHtmlToc: false,
      };

      render(
        <AdminPostForm
          mode="edit"
          postId="123"
          initial={editInitial as any}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      const tocCheckbox = screen.getByLabelText("顯示系統自動目錄");
      expect(tocCheckbox).not.toBeChecked();

      await userEvent.click(tocCheckbox);
      expect(tocCheckbox).toBeChecked();

      await userEvent.click(screen.getByRole("button", { name: "儲存" }));

      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body as string);
      expect(body.showRawHtmlToc).toBe(true);
    });
  });

  describe("lossy mode-switch confirmation (4.2)", () => {
    it("switching visual -> raw with rich HTML content does not warn and switches immediately", async () => {
      render(
        <AdminPostForm
          mode="create"
          initial={mockInitial}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      await userEvent.type(
        screen.getByTestId("tiptap-editor"),
        '<div style="color:red">x</div>'
      );

      await userEvent.click(screen.getByRole("radio", { name: "原始 HTML" }));

      expect(screen.queryByTestId("mode-switch-warning")).not.toBeInTheDocument();
      expect(screen.getByTestId("raw-html-editor")).toHaveValue(
        '<div style="color:red">x</div>'
      );
    });

    it("switching raw -> visual with block/inline-style content shows a pre-switch warning and does not switch yet", async () => {
      const editInitial = {
        ...mockInitial,
        content: '<div style="color:red">x</div>',
        allowRawHtml: true,
      };

      render(
        <AdminPostForm
          mode="create"
          initial={editInitial as any}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      expect(screen.getByTestId("raw-html-editor")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("radio", { name: "視覺編輯器" }));

      expect(screen.getByTestId("mode-switch-warning")).toBeInTheDocument();
      // 尚未切換：raw editor 仍在畫面上，內容未被 sanitize
      expect(screen.getByTestId("raw-html-editor")).toHaveValue(
        '<div style="color:red">x</div>'
      );
      expect(screen.getByRole("radio", { name: "原始 HTML" })).toBeChecked();
    });

    it("cancelling the pre-switch warning leaves mode and content unchanged", async () => {
      const editInitial = {
        ...mockInitial,
        content: '<div style="color:red">x</div>',
        allowRawHtml: true,
      };

      render(
        <AdminPostForm
          mode="create"
          initial={editInitial as any}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      await userEvent.click(screen.getByRole("radio", { name: "視覺編輯器" }));
      expect(screen.getByTestId("mode-switch-warning")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "取消" }));

      expect(screen.queryByTestId("mode-switch-warning")).not.toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "原始 HTML" })).toBeChecked();
      expect(screen.getByTestId("raw-html-editor")).toHaveValue(
        '<div style="color:red">x</div>'
      );
    });

    it("confirming the pre-switch warning switches modes without sanitizing the content itself", async () => {
      const editInitial = {
        ...mockInitial,
        content: '<div style="color:red">x</div>',
        allowRawHtml: true,
      };

      render(
        <AdminPostForm
          mode="create"
          initial={editInitial as any}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      await userEvent.click(screen.getByRole("radio", { name: "視覺編輯器" }));
      await userEvent.click(screen.getByRole("button", { name: "確認切換" }));

      expect(screen.queryByTestId("mode-switch-warning")).not.toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "視覺編輯器" })).toBeChecked();
      // 切換本身不呼叫任何伺服器 sanitizer；raw 內容原樣進入視覺編輯器 state
      expect(screen.getByTestId("tiptap-editor")).toHaveValue(
        '<div style="color:red">x</div>'
      );
    });

    it("restores each mode's unsaved draft when switching back and forth within the same session", async () => {
      render(
        <AdminPostForm
          mode="create"
          initial={mockInitial}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );

      // 視覺模式輸入純文字內容（不觸發 lossy 警告）
      await userEvent.type(screen.getByTestId("tiptap-editor"), "<p>hello</p>");

      // 切到原始 HTML 模式（非破壞性），編輯 raw 草稿
      await userEvent.click(screen.getByRole("radio", { name: "原始 HTML" }));
      const rawEditor = screen.getByTestId("raw-html-editor");
      await userEvent.clear(rawEditor);
      await userEvent.type(rawEditor, "<p>raw draft</p>");

      // 切回視覺模式：應恢復先前的視覺草稿，而不是遺失
      await userEvent.click(screen.getByRole("radio", { name: "視覺編輯器" }));
      expect(screen.getByTestId("tiptap-editor")).toHaveValue("<p>hello</p>");

      // 再切回原始 HTML 模式：應恢復剛才編輯的 raw 草稿
      await userEvent.click(screen.getByRole("radio", { name: "原始 HTML" }));
      expect(screen.getByTestId("raw-html-editor")).toHaveValue("<p>raw draft</p>");
    });
  });

  describe("sticky action bar / IA regions (4.6)", () => {
    function renderEditForm(overrides: Partial<typeof mockInitial> = {}) {
      const editInitial = {
        ...mockInitial,
        title: "Old Title",
        slug: "old",
        content: "Old",
        excerpt: "Old",
        ...overrides,
      };
      return render(
        <AdminPostForm
          mode="edit"
          postId="123"
          initial={editInitial as any}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );
    }

    it("renders a sticky action bar region containing the back link, status area, and preview/save controls", () => {
      renderEditForm();

      const actionBar = screen.getByTestId("post-form-action-bar");
      expect(actionBar).toBeInTheDocument();

      expect(
        within(actionBar).getByRole("link", { name: "返回列表" })
      ).toBeInTheDocument();
      expect(
        within(actionBar).getByTestId("post-form-status")
      ).toBeInTheDocument();
      expect(
        within(actionBar).getByRole("button", { name: "預覽" })
      ).toBeInTheDocument();
      expect(
        within(actionBar).getByRole("button", { name: "儲存" })
      ).toBeInTheDocument();
    });

    it("renders the main authoring region containing title, excerpt, mode selector, and the content editor", () => {
      renderEditForm();

      const mainRegion = screen.getByTestId("post-form-main");
      expect(mainRegion).toBeInTheDocument();

      expect(within(mainRegion).getByLabelText("標題")).toBeInTheDocument();
      expect(within(mainRegion).getByLabelText("摘要")).toBeInTheDocument();
      expect(
        within(mainRegion).getByRole("radiogroup", { name: "編輯模式" })
      ).toBeInTheDocument();
      expect(within(mainRegion).getByTestId("tiptap-editor")).toBeInTheDocument();
    });

    it("renders the settings region containing status, publish time, categories, tags, cover, featured, reading time, and SEO fields", () => {
      renderEditForm();

      const settingsRegion = screen.getByTestId("post-form-settings");
      expect(settingsRegion).toBeInTheDocument();

      expect(within(settingsRegion).getByText("狀態")).toBeInTheDocument();
      expect(
        within(settingsRegion).getByLabelText("發佈時間（可空）")
      ).toBeInTheDocument();
      expect(within(settingsRegion).getByText("分類（可多選）")).toBeInTheDocument();
      expect(within(settingsRegion).getByText("標籤（可多選）")).toBeInTheDocument();
      expect(
        within(settingsRegion).getByLabelText("閱讀時間（可空）")
      ).toBeInTheDocument();
      expect(
        within(settingsRegion).getByText("精選文章（首頁 Featured）")
      ).toBeInTheDocument();
      expect(within(settingsRegion).getByLabelText("SEO 標題")).toBeInTheDocument();
      expect(within(settingsRegion).getByLabelText("SEO 描述")).toBeInTheDocument();
      expect(within(settingsRegion).getByLabelText("OG 圖片")).toBeInTheDocument();
    });

    it("orders the regions in the DOM as action bar, then main authoring, then settings", () => {
      renderEditForm();

      const actionBar = screen.getByTestId("post-form-action-bar");
      const mainRegion = screen.getByTestId("post-form-main");
      const settingsRegion = screen.getByTestId("post-form-settings");

      expect(
        actionBar.compareDocumentPosition(mainRegion) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        mainRegion.compareDocumentPosition(settingsRegion) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });

    it("shows the save error message inside the action bar status area on save failure", async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, message: "儲存失敗了" }),
      });

      renderEditForm();

      await userEvent.click(screen.getByRole("button", { name: "儲存" }));

      await waitFor(() => {
        expect(
          within(screen.getByTestId("post-form-action-bar")).getByTestId(
            "post-form-status"
          )
        ).toHaveTextContent("儲存失敗了");
      });
    });

    it("keeps editing title, excerpt, categories, tags, and SEO fields all reflected in the submit payload after the layout split", async () => {
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

      await userEvent.type(screen.getByLabelText("標題"), "Split Title");
      await userEvent.type(screen.getByLabelText("摘要"), "Split Excerpt");
      await userEvent.type(screen.getByTestId("tiptap-editor"), "<p>Content</p>");
      await userEvent.click(screen.getByLabelText("Tech"));
      await userEvent.click(screen.getByLabelText("React"));
      await userEvent.type(screen.getByLabelText("SEO 標題"), "Split SEO Title");
      await userEvent.type(screen.getByLabelText("SEO 描述"), "Split SEO Desc");
      await userEvent.type(screen.getByLabelText("OG 圖片"), "og.jpg");

      await userEvent.click(screen.getByRole("button", { name: "儲存" }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call?.[1]?.body as string);

      expect(body.title).toBe("Split Title");
      expect(body.excerpt).toBe("Split Excerpt");
      expect(body.categoryIds).toEqual(["cat1"]);
      expect(body.tagIds).toEqual(["tag1"]);
      expect(body.seoTitle).toBe("Split SEO Title");
      expect(body.seoDescription).toBe("Split SEO Desc");
      expect(body.ogImage).toBe("og.jpg");
    });
  });

  describe("recoverable editing workflow", () => {
    const editInitial = {
      ...mockInitial,
      title: "Old Title",
      slug: "old",
      content: "Old content",
      excerpt: "Old excerpt",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    function renderDraft(overrides: Partial<typeof editInitial> = {}) {
      return render(
        <AdminPostForm
          mode="edit"
          postId="123"
          initial={{ ...editInitial, ...overrides }}
          categories={mockCategories as any}
          tags={mockTags as any}
        />
      );
    }

    it("debounces auto-save only after a draft becomes dirty and preserves publication state", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { updatedAt: "2026-01-01T00:01:00.000Z" } }),
      });
      try {
        renderDraft();
        await act(() => vi.advanceTimersByTimeAsync(1500));
        expect(fetchMock).not.toHaveBeenCalled();

        fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Auto saved title" } });
        await act(() => vi.advanceTimersByTimeAsync(1100));

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
        expect(body.status).toBe("DRAFT");
        expect(screen.getByTestId("post-form-status")).toHaveTextContent("上次自動儲存");
      } finally {
        vi.useRealTimers();
      }
    });

    it("儲存請求進行中的新編輯仍保持 dirty 並續發自動儲存（不遺失）", async () => {
      vi.useFakeTimers();
      let resolveFirst: (value: unknown) => void = () => {};
      const firstResponse = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      fetchMock
        .mockReturnValueOnce(firstResponse)
        .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { updatedAt: "2026-01-01T00:02:00.000Z" } }) });
      try {
        renderDraft();
        fireEvent.change(screen.getByLabelText("標題"), { target: { value: "First edit" } });
        await act(() => vi.advanceTimersByTimeAsync(1100));
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // 首次儲存尚未回應時再次修改另一欄位。
        fireEvent.change(screen.getByLabelText("摘要"), { target: { value: "Edited during save" } });

        // 解析首次請求（回傳送出當下的舊快照）。
        await act(async () => {
          resolveFirst({ ok: true, json: async () => ({ success: true, data: { updatedAt: "2026-01-01T00:01:00.000Z" } }) });
        });

        // 請求期間的新編輯不得被誤清 dirty → 應對含新摘要的內容續發第二次自動儲存。
        await act(() => vi.advanceTimersByTimeAsync(1100));
        expect(fetchMock).toHaveBeenCalledTimes(2);
        const secondBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
        expect(secondBody.excerpt).toBe("Edited during save");
      } finally {
        vi.useRealTimers();
      }
    });

    it("自動儲存失敗後（使用者未再輸入）仍會對相同內容重試", async () => {
      vi.useFakeTimers();
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ success: false, message: "伺服器錯誤" }) })
        .mockResolvedValue({ ok: true, json: async () => ({ success: true, data: { updatedAt: "2026-01-01T00:01:00.000Z" } }) });
      try {
        renderDraft();
        fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Retry title" } });
        await act(() => vi.advanceTimersByTimeAsync(1100));
        expect(fetchMock).toHaveBeenCalledTimes(1);

        // 失敗後不再輸入，時間前進應對相同內容重試並最終成功。
        await act(() => vi.advanceTimersByTimeAsync(1100));
        await act(() => vi.advanceTimersByTimeAsync(1100));
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(screen.getByTestId("post-form-status")).toHaveTextContent("上次自動儲存");
      } finally {
        vi.useRealTimers();
      }
    });

    it("自動儲存偵測到會被剝除的 HTML 時暫停並提示，不觸發阻塞式確認", async () => {
      vi.useFakeTimers();
      const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
      try {
        renderDraft({ content: '<div style="color:red">rich</div>' });
        fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Trigger autosave" } });
        await act(() => vi.advanceTimersByTimeAsync(1100));

        expect(confirmSpy).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(screen.getByTestId("post-form-status")).toHaveTextContent("已暫停自動儲存");
      } finally {
        confirmSpy.mockRestore();
        vi.useRealTimers();
      }
    });

    it("warns before unloading while local changes are not safely persisted", () => {
      renderDraft();
      fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Unsaved title" } });

      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it("stops auto-save after an optimistic conflict and shows recovery actions", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ success: false, message: "文章已被其他人更新" }),
      });
      try {
        renderDraft();
        fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Conflicting title" } });
        await act(() => vi.advanceTimersByTimeAsync(1100));

        expect(screen.getByRole("alert")).toHaveTextContent("偵測到版本衝突");
        expect(screen.getByRole("button", { name: "重新載入最新版本" })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText("摘要"), { target: { value: "Another local edit" } });
        await act(() => vi.advanceTimersByTimeAsync(1100));
        expect(fetchMock).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("keeps draft status and focuses an error summary when publication checks fail", () => {
      renderDraft({ title: "" });

      fireEvent.click(screen.getByRole("radio", { name: "已發佈" }));

      expect(screen.getByRole("radio", { name: "草稿" })).toBeChecked();
      expect(screen.getByRole("alert")).toHaveTextContent("發布前請修正");
      expect(document.activeElement).toBe(screen.getByLabelText("標題"));
    });

    it("exposes version history through the existing versions API", async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ id: "v1", title: "Earlier title", editorName: "Editor", createdAt: "2026-01-01T00:00:00.000Z" }],
        }),
      });
      renderDraft();

      await userEvent.click(screen.getByRole("button", { name: "版本歷史" }));

      expect(fetchMock).toHaveBeenCalledWith("/api/posts/123/versions");
      expect(await screen.findByText("Earlier title")).toBeInTheDocument();
    });

    it("連續三次暫時性失敗後暫停自動儲存，不再無限重試", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({ success: false, message: "伺服器錯誤" }) });
      try {
        renderDraft();
        fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Persistent failure" } });
        // 首次嘗試 + 兩次重試 = 3 次後暫停。
        for (let i = 0; i < 6; i += 1) {
          await act(() => vi.advanceTimersByTimeAsync(1100));
        }
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(screen.getByTestId("post-form-status")).toHaveTextContent("自動儲存已暫停");
      } finally {
        vi.useRealTimers();
      }
    });

    it("非暫時性失敗（4xx，如重複 slug）不重試自動儲存", async () => {
      vi.useFakeTimers();
      fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ success: false, message: "Slug 已存在" }) });
      try {
        renderDraft();
        fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Duplicate slug" } });
        await act(() => vi.advanceTimersByTimeAsync(1100));
        await act(() => vi.advanceTimersByTimeAsync(1100));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("post-form-status")).toHaveTextContent("自動儲存已暫停");
      } finally {
        vi.useRealTimers();
      }
    });

    it("dirty 時攔截站內連結導覽並改走離開確認對話框", () => {
      renderDraft();
      fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Unsaved before nav" } });

      const anchor = document.createElement("a");
      anchor.href = "/admin/media";
      anchor.textContent = "媒體庫";
      document.body.appendChild(anchor);
      try {
        // fireEvent 回傳 false 代表 preventDefault 被呼叫 → 導覽被攔截。
        const notPrevented = fireEvent.click(anchor);

        expect(notPrevented).toBe(false);
        expect(screen.getByRole("dialog", { name: "尚有未儲存變更" })).toBeInTheDocument();
      } finally {
        anchor.remove();
      }
    });

    it("版本歷史可檢視版本詳情並經確認後還原", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: "v1", title: "Earlier title", editorName: "Editor", createdAt: "2026-01-01T00:00:00.000Z" }],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: "v1", title: "Earlier title", excerpt: "Old excerpt", content: "<p>old</p>", allowRawHtml: true, showRawHtmlToc: false, editorName: "Editor", createdAt: "2026-01-01T00:00:00.000Z" },
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { message: "已還原到選定版本" } }) });
      renderDraft();
      await userEvent.click(screen.getByRole("button", { name: "版本歷史" }));
      await screen.findByText("Earlier title");

      await userEvent.click(screen.getByRole("button", { name: "檢視" }));
      expect(fetchMock).toHaveBeenCalledWith("/api/posts/123/versions/v1");
      expect(await screen.findByText("<p>old</p>")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "還原" }));
      expect(screen.getByRole("dialog", { name: "確認還原版本" })).toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: "確認還原" }));

      // 還原成功後會 window.location.reload()（jsdom 僅記錄 not-implemented，不中斷測試）。
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith("/api/posts/123/versions/v1", expect.objectContaining({ method: "POST" }))
      );
    });

    it("dirty 表單經確認還原成功後的重載不再被 beforeunload 攔截", async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: "v1", title: "Earlier title", editorName: "Editor", createdAt: "2026-01-01T00:00:00.000Z" }],
          }),
        })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { message: "已還原到選定版本" } }) });
      renderDraft();
      fireEvent.change(screen.getByLabelText("標題"), { target: { value: "Unsaved local edit" } });

      // dirty 期間 beforeunload 應攔截。
      const guarded = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(guarded);
      expect(guarded.defaultPrevented).toBe(true);

      await userEvent.click(screen.getByRole("button", { name: "版本歷史" }));
      await screen.findByText("Earlier title");
      await userEvent.click(screen.getByRole("button", { name: "還原" }));
      await userEvent.click(screen.getByRole("button", { name: "確認還原" }));
      await waitFor(() =>
        expect(fetchMock).toHaveBeenCalledWith("/api/posts/123/versions/v1", expect.objectContaining({ method: "POST" }))
      );

      // 使用者已在確認框同意放棄變更：還原成功觸發的 reload 不應再被二次攔截。
      const bypassed = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(bypassed);
      expect(bypassed.defaultPrevented).toBe(false);
    });

    it("shows SEO counts, search preview, reading estimate and searchable taxonomy pickers", async () => {
      renderDraft();

      await userEvent.type(screen.getByLabelText("SEO 標題"), "搜尋標題");
      await userEvent.type(screen.getByLabelText("SEO 描述"), "搜尋描述");

      expect(screen.getByText(/SEO 標題字數：4/)).toBeInTheDocument();
      expect(screen.getByText(/SEO 描述字數：4/)).toBeInTheDocument();
      expect(screen.getByTestId("seo-preview")).toHaveTextContent("搜尋標題");
      expect(screen.getByText(/預估閱讀時間：/)).toBeInTheDocument();
      expect(screen.getByRole("searchbox", { name: "搜尋分類" })).toBeInTheDocument();
      expect(screen.getByRole("searchbox", { name: "搜尋標籤" })).toBeInTheDocument();
    });
  });
});

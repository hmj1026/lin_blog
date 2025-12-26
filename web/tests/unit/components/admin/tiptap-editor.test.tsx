import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TiptapEditor } from "@/components/admin/tiptap-editor";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// Mock window.prompt
const promptMock = vi.fn();
vi.stubGlobal("prompt", promptMock);

// Mock Tiptap
const mockChain = {
  focus: vi.fn().mockReturnThis(),
  toggleBold: vi.fn().mockReturnThis(),
  toggleItalic: vi.fn().mockReturnThis(),
  toggleUnderline: vi.fn().mockReturnThis(),
  toggleStrike: vi.fn().mockReturnThis(),
  toggleHeading: vi.fn().mockReturnThis(),
  toggleBulletList: vi.fn().mockReturnThis(),
  toggleOrderedList: vi.fn().mockReturnThis(),
  toggleBlockquote: vi.fn().mockReturnThis(),
  setLink: vi.fn().mockReturnThis(),
  unsetLink: vi.fn().mockReturnThis(),
  setImage: vi.fn().mockReturnThis(),
  setTextAlign: vi.fn().mockReturnThis(),
  setHorizontalRule: vi.fn().mockReturnThis(),
  run: vi.fn(),
};

const mockCommands = {
  setContent: vi.fn(),
};

const mockEditor = {
  getHTML: vi.fn().mockReturnValue("<p>Initial Content</p>"),
  getAttributes: vi.fn().mockReturnValue({}),
  chain: vi.fn().mockReturnValue(mockChain),
  commands: mockCommands,
  isEditable: true,
};

vi.mock("@tiptap/react", () => ({
  useEditor: ({ onUpdate }: any) => {
    // Expose onUpdate to trigger changes manually if needed
    (mockEditor as any)._onUpdate = onUpdate;
    return mockEditor;
  },
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock("@tiptap/starter-kit", () => ({ default: { configure: vi.fn() } }));
vi.mock("tiptap-extension-resize-image", () => ({ default: { configure: vi.fn() } }));
vi.mock("@tiptap/extension-link", () => ({ default: { configure: vi.fn() } }));
vi.mock("@tiptap/extension-underline", () => ({ default: {} }));
vi.mock("@tiptap/extension-text-align", () => ({ default: { configure: vi.fn() } }));

describe("TiptapEditor", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockEditor.getHTML.mockReturnValue("<p>Initial Content</p>");
  });

  it("renders editor and toolbar", () => {
    render(<TiptapEditor value="<p>Initial Content</p>" onChange={onChange} />);
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
    expect(screen.getByText("粗體")).toBeInTheDocument();
    expect(screen.getByText("HTML")).toBeInTheDocument();
  });

  it("executes formatting commands", async () => {
    render(<TiptapEditor value="<p>Initial Content</p>" onChange={onChange} />);

    await userEvent.click(screen.getByText("粗體"));
    expect(mockChain.toggleBold).toHaveBeenCalled();
    expect(mockChain.run).toHaveBeenCalled();

    await userEvent.click(screen.getByText("H2"));
    expect(mockChain.toggleHeading).toHaveBeenCalledWith({ level: 2 });
  });

  it("toggles HTML mode", async () => {
    render(<TiptapEditor value="<p>Initial Content</p>" onChange={onChange} />);

    // Switch to HTML mode
    await userEvent.click(screen.getByText("HTML"));
    expect(screen.getByRole("textbox")).toHaveValue("<p>Initial Content</p>");
    expect(screen.queryByTestId("editor-content")).not.toBeInTheDocument();

    // Edit HTML
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "<p>New Content</p>");

    // Switch back to Visual mode
    await userEvent.click(screen.getByText("HTML"));
    
    // Should update editor content
    expect(mockCommands.setContent).toHaveBeenCalledWith("<p>New Content</p>", expect.anything());
    // Should call onChange with new content (simulated)
    // In component: onChange(editor.getHTML()) is called inside logic?
    // Actually: editor.commands.setContent is called.
    // The component depends on `onUpdate` from Tiptap to call `onChange`.
    // Since we mocked useEditor, `onUpdate` won't be called automatically by setContent unless we simulate it or check setContent args.
    // The test verifies `setContent` is called, which is correct for the component logic.
  });

  it("handles image upload", async () => {
    const { container } = render(<TiptapEditor value="" onChange={onChange} />);
    
    // Use container to find the hidden input since it's not accessible via label
    const input = container.querySelector('input[type="file"]');
    if (!input) throw new Error("File input not found");

    const file = new File(["dummy"], "test.png", { type: "image/png" });
    
    // Mock successful upload response
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { src: "/uploads/test.png" } }),
    });

    await userEvent.upload(input as HTMLElement, file);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/uploads", expect.any(Object));
    });
    
    expect(mockChain.setImage).toHaveBeenCalledWith({ src: "/uploads/test.png", alt: "test.png" });
  });

  it("handles link insertion", async () => {
    render(<TiptapEditor value="" onChange={onChange} />);
    
    promptMock.mockReturnValue("https://example.com");
    await userEvent.click(screen.getByText("連結"));
    
    expect(mockChain.setLink).toHaveBeenCalledWith({ href: "https://example.com" });
  });

  it("toggles underline", async () => {
    render(<TiptapEditor value="" onChange={onChange} />);
    await userEvent.click(screen.getByText("底線"));
    expect(mockChain.toggleUnderline).toHaveBeenCalled();
  });

  it("toggles strikethrough", async () => {
    render(<TiptapEditor value="" onChange={onChange} />);
    await userEvent.click(screen.getByText("刪除線"));
    expect(mockChain.toggleStrike).toHaveBeenCalled();
  });

  it("sets text alignment", async () => {
    render(<TiptapEditor value="" onChange={onChange} />);
    await userEvent.click(screen.getByText("置中"));
    expect(mockChain.setTextAlign).toHaveBeenCalledWith("center");
  });

  it("inserts horizontal rule", async () => {
    render(<TiptapEditor value="" onChange={onChange} />);
    await userEvent.click(screen.getByText("分隔線"));
    expect(mockChain.setHorizontalRule).toHaveBeenCalled();
  });
});

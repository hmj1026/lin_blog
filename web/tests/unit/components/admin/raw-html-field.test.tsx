import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RawHtmlField } from "@/components/admin/post-form/raw-html-field";

// Mock fetch (uploadImageBlob → POST /api/uploads)
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// Mock clipboard
const writeTextMock = vi.fn();
Object.assign(navigator, {
  clipboard: { writeText: writeTextMock },
});

// Mock ImageCropperModal - immediately exposes a confirm button that calls
// onConfirm with a fixed crop payload, same pattern as tiptap-editor.test.tsx.
vi.mock("@/components/admin/image-cropper-modal", () => ({
  ImageCropperModal: ({ open, onConfirm, onCancel }: any) => {
    return open ? (
      <div data-testid="crop-modal">
        <button
          data-testid="crop-confirm"
          onClick={() =>
            onConfirm({
              cropAreaPixels: { x: 0, y: 0, width: 100, height: 100 },
              outputWidth: 1200,
              outputHeight: 630,
              mimeType: "image/jpeg",
            })
          }
        >
          套用
        </button>
        <button data-testid="crop-cancel" onClick={onCancel}>
          取消
        </button>
      </div>
    ) : null;
  },
  cropImageToBlob: vi.fn().mockResolvedValue(new Blob(["cropped"], { type: "image/jpeg" })),
}));

async function uploadAndCrop(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("File input not found");
  const file = new File(["dummy"], "test.png", { type: "image/png" });
  await userEvent.upload(input as HTMLElement, file);
  await waitFor(() => {
    expect(screen.getByTestId("crop-modal")).toBeInTheDocument();
  });
  await userEvent.click(screen.getByTestId("crop-confirm"));
}

describe("RawHtmlField", () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the raw textarea bound to value", () => {
    render(<RawHtmlField value="<p>hi</p>" onChange={onChange} />);
    expect(screen.getByTestId("raw-html-editor")).toHaveValue("<p>hi</p>");
  });

  it("exposes an accessible name for the raw HTML textarea", () => {
    render(<RawHtmlField value="" onChange={onChange} />);
    expect(screen.getByRole("textbox", { name: /原始 HTML/ })).toBe(
      screen.getByTestId("raw-html-editor")
    );
  });

  it("shows alt input, preview, and insert/copy controls after a successful upload", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { src: "/api/files/abc123" } }),
    });

    const { container } = render(<RawHtmlField value="" onChange={onChange} />);
    await uploadAndCrop(container);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/uploads", expect.any(Object));
    });

    expect(screen.getByLabelText(/alt|替代文字/i)).toBeInTheDocument();
    const preview = screen.getByRole("img");
    expect(preview).toHaveAttribute("src", "/api/files/abc123");
    expect(screen.getByRole("button", { name: "插入到游標" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "複製圖片網址" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "複製 <img> 標籤" })).toBeInTheDocument();
  });

  it("inserts the escaped <img> fragment at the caret and calls onChange", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { src: "/api/files/abc123" } }),
    });

    const { container } = render(<RawHtmlField value="AABB" onChange={onChange} />);
    await uploadAndCrop(container);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "插入到游標" })).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("raw-html-editor") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(2, 2);

    const altInput = screen.getByLabelText(/alt|替代文字/i);
    await userEvent.type(altInput, "貓咪");

    await userEvent.click(screen.getByRole("button", { name: "插入到游標" }));

    expect(onChange).toHaveBeenCalledWith(
      'AA<img src="/api/files/abc123" alt="貓咪" />BB'
    );
  });

  it("copies the relative image URL to the clipboard", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { src: "/api/files/abc123" } }),
    });

    const { container } = render(<RawHtmlField value="" onChange={onChange} />);
    await uploadAndCrop(container);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "複製圖片網址" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "複製圖片網址" }));

    expect(writeTextMock).toHaveBeenCalledWith("/api/files/abc123");
  });

  it("copies the <img> tag fragment to the clipboard", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { src: "/api/files/abc123" } }),
    });

    const { container } = render(<RawHtmlField value="" onChange={onChange} />);
    await uploadAndCrop(container);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "複製 <img> 標籤" })).toBeInTheDocument();
    });

    const altInput = screen.getByLabelText(/alt|替代文字/i);
    await userEvent.type(altInput, "貓咪");

    await userEvent.click(screen.getByRole("button", { name: "複製 <img> 標籤" }));

    expect(writeTextMock).toHaveBeenCalledWith(
      '<img src="/api/files/abc123" alt="貓咪" />'
    );
  });

  it("shows an error and does not call onChange when the upload fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: "上傳失敗" }),
    });

    const { container } = render(<RawHtmlField value="unchanged" onChange={onChange} />);
    await uploadAndCrop(container);

    await waitFor(() => {
      expect(screen.getByText("上傳失敗")).toBeInTheDocument();
    });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "插入到游標" })).not.toBeInTheDocument();
  });

  it("shows a copy-failed message and leaves value unchanged when clipboard write rejects", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { src: "/api/files/abc123" } }),
    });
    writeTextMock.mockRejectedValueOnce(new Error("denied"));

    const { container } = render(<RawHtmlField value="unchanged" onChange={onChange} />);
    await uploadAndCrop(container);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "複製圖片網址" })).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "複製圖片網址" }));

    await waitFor(() => {
      expect(screen.getByText(/複製失敗/)).toBeInTheDocument();
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});

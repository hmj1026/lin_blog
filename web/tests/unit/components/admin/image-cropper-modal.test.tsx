import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageCropperModal } from "@/components/admin/image-cropper-modal";

// Mock react-easy-crop
// It renders a container with images. It calls onCropComplete on mount or change.
vi.mock("react-easy-crop", () => ({
  default: ({ onCropComplete, onZoomChange }: any) => {
    // Simulate initial crop complete
    setTimeout(() => {
        onCropComplete({ x: 0, y: 0, width: 100, height: 100 }, { x: 0, y: 0, width: 100, height: 100 });
    }, 0);
    return (
      <div data-testid="cropper">
        <button onClick={() => onZoomChange(2)}>Zoom In Mock</button>
      </div>
    );
  },
}));

describe("ImageCropperModal", () => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when not open", () => {
    render(
      <ImageCropperModal
        open={false}
        imageUrl="test.jpg"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
    expect(screen.queryByText("裁切封面")).not.toBeInTheDocument();
  });

  it("renders when open", async () => {
    render(
      <ImageCropperModal
        open={true}
        imageUrl="test.jpg"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByText("裁切封面")).toBeInTheDocument();
    expect(screen.getByTestId("cropper")).toBeInTheDocument();
  });

  it("handles cancel", async () => {
    render(
      <ImageCropperModal
        open={true}
        imageUrl="test.jpg"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
    const cancelBtn = screen.getByText("取消");
    await userEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it("handles confirm", async () => {
    render(
      <ImageCropperModal
        open={true}
        imageUrl="test.jpg"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    // Wait for initial onCropComplete
    // The "套用並上傳" button is disabled until area is set
    const confirmBtn = screen.getByText("套用並上傳");
    // Initially disabled?
    // In useEffect? No, area state set by callback.
    // Our mock calls it via setTimeout 0.
    
    await waitFor(() => {
        expect(confirmBtn).not.toBeDisabled();
    });

    await userEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
      cropAreaPixels: expect.anything(),
      outputWidth: 1200, // Default preset w
    }));
  });

  it("changes aspect ratio preset", async () => {
    render(
      <ImageCropperModal
        open={true}
        imageUrl="test.jpg"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    const squarePreset = screen.getByText("1:1");
    await userEvent.click(squarePreset);

    // Click confirm to verify output width/height changed
    await waitFor(() => expect(screen.getByText("套用並上傳")).toBeEnabled());
    await userEvent.click(screen.getByText("套用並上傳"));

    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({
       outputWidth: 1080,
       outputHeight: 1080
    }));
  });
});

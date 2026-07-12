import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PreviewModal } from "@/components/admin/post-form/preview-modal";

// Renders the REAL PreviewModal (not a stub) so the slug -> preview-URL behaviour is actually proven.
describe("PreviewModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a preview iframe whose src is the preview URL derived from the slug", () => {
    render(<PreviewModal slug="hello-world" onClose={() => {}} />);

    const iframe = screen.getByTitle("post-preview") as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute("src")).toBe("/api/preview?slug=hello-world");
  });

  it("shows the slug and URL-encodes it into the preview src", () => {
    render(<PreviewModal slug=" を post" onClose={() => {}} />);

    expect(screen.getByText(/預覽：/)).toHaveTextContent("を post");
    const iframe = screen.getByTitle("post-preview") as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toBe(`/api/preview?slug=${encodeURIComponent(" を post".trim())}`);
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<PreviewModal slug="s" onClose={onClose} />);

    await userEvent.click(screen.getByRole("button", { name: "關閉" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens the preview URL in a new tab from the 新分頁 button", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<PreviewModal slug="hello-world" onClose={() => {}} />);

    await userEvent.click(screen.getByRole("button", { name: "新分頁" }));
    expect(openSpy).toHaveBeenCalledWith("/api/preview?slug=hello-world", "_blank", "noopener,noreferrer");
  });
});

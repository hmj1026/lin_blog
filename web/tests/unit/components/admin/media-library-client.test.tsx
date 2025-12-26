import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaLibraryClient } from "@/components/admin/media-library-client";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// Mock alert & confirm
const alertMock = vi.fn();
const confirmMock = vi.fn();
vi.stubGlobal("alert", alertMock);
vi.stubGlobal("confirm", confirmMock);

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

// Mock Next.js Image
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

const mockUploads = [
  {
    id: "1",
    originalName: "image1.jpg",
    mimeType: "image/jpeg",
    size: 1024 * 500, // 500KB
    createdAt: "2023-01-01T10:00:00Z",
    src: "/api/files/1",
  },
  {
    id: "2",
    originalName: "doc.pdf",
    mimeType: "application/pdf",
    size: 1024 * 1024 * 2, // 2MB
    createdAt: "2023-01-02T10:00:00Z",
    src: "/api/files/2",
  },
];

describe("MediaLibraryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    confirmMock.mockReturnValue(true);
  });

  it("loads and displays uploads", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockUploads }),
    });

    render(<MediaLibraryClient />);

    expect(screen.getByText("載入中...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("image1.jpg")).toBeInTheDocument();
    });
    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    expect(screen.getByText("500.0 KB")).toBeInTheDocument();
    expect(screen.getByText("2.0 MB")).toBeInTheDocument();
  });

  it("filters uploads by search and type", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockUploads }),
    });

    render(<MediaLibraryClient />);
    await waitFor(() => expect(screen.getByText("image1.jpg")).toBeInTheDocument());

    // Search
    const searchInput = screen.getByPlaceholderText("搜尋檔案名稱...");
    await userEvent.type(searchInput, "image");
    expect(screen.getByText("image1.jpg")).toBeInTheDocument();
    expect(screen.queryByText("doc.pdf")).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    
    // Type filter
    const select = screen.getByRole("combobox"); // Combobox with options
    // Or get by display value/class if hard to find. Tailwind select doesn't use semantic Select usually?
    // The code uses standard <select>.
    
    await userEvent.selectOptions(select, "application/pdf");
    expect(screen.queryByText("image1.jpg")).not.toBeInTheDocument();
    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
  });

  it("handles deletion", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockUploads }),
    });

    render(<MediaLibraryClient />);
    await waitFor(() => expect(screen.getByText("image1.jpg")).toBeInTheDocument());

    // Mock delete success
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Find delete button for image1
    // The buttons are hidden until hover (opacity-0 transition group-hover:opacity-100)
    // But they are in DOM.
    // Need to find specific button.
    // <button>刪除</button> or "刪除中..."
    // Since we have multiple, let's look within the card of image1
    // Or just get all "刪除" buttons and click the first.
    
    const deleteButtons = screen.getAllByText("刪除");
    await userEvent.click(deleteButtons[0]);

    expect(confirmMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/uploads/1", expect.objectContaining({ method: "DELETE" }));

    await waitFor(() => {
       expect(screen.queryByText("image1.jpg")).not.toBeInTheDocument();
    });
  });

  it("copies link to clipboard", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockUploads }),
    });

    render(<MediaLibraryClient />);
    await waitFor(() => expect(screen.getByText("image1.jpg")).toBeInTheDocument());

    const copyButtons = screen.getAllByText("複製連結");
    await userEvent.click(copyButtons[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("/api/files/1");
  });
});

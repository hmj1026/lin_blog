import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

// Mock CoverUploader
vi.mock("@/components/admin/post-form/cover-uploader", () => ({
  CoverUploader: ({ onCoverChange }: any) => (
    <button onClick={() => onCoverChange("new-image.jpg")}>Upload Cover</button>
  ),
}));

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockSettings = {
  siteName: "Test Site",
  siteTagline: "Test Tagline",
  siteDescription: "Test Description",
  contactEmail: "test@example.com",
  copyrightText: "Copyright",
  showBlogLink: true,
  showNewsletter: false,
  showContact: true,
  heroBadge: "Badge",
  heroTitle: "Hero Title",
  heroSubtitle: "Hero Subtitle",
  heroImage: "old-image.jpg",
  featuredTitle: "Featured",
  featuredDesc: "Desc",
  latestTitle: "Latest",
  latestDesc: "Desc",
  categoriesTitle: "Categories",
  categoriesDesc: "Desc",
  communityTitle: "Community",
  communityDesc: "Desc",
} as any;

const mockCategories = [
  { id: "1", slug: "cat-1", name: "Category 1", showInNav: true, navOrder: 1 },
];

describe("SiteSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("renders with initial settings", () => {
    render(<SiteSettingsForm initialSettings={mockSettings} categories={mockCategories} />);
    expect(screen.getByDisplayValue("Test Site")).toBeInTheDocument();
  });

  it("switches tabs", async () => {
    render(<SiteSettingsForm initialSettings={mockSettings} categories={mockCategories} />);
    
    // Switch to Hero tab
    await userEvent.click(screen.getByText("Hero 區塊"));
    expect(screen.getByText("Hero 區塊設定")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hero Title")).toBeInTheDocument();

    // Switch to Categories tab
    await userEvent.click(screen.getByText("分類管理"));
    expect(screen.getByText("分類連結")).toBeInTheDocument();
  });

  it("updates site name", async () => {
    render(<SiteSettingsForm initialSettings={mockSettings} categories={mockCategories} />);
    
    const input = screen.getByDisplayValue("Test Site");
    await userEvent.clear(input);
    await userEvent.type(input, "Updated Site");
    
    expect(input).toHaveValue("Updated Site");
  });

  it("saves settings successfully", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SiteSettingsForm initialSettings={mockSettings} categories={mockCategories} />);
    
    // Change a value
    const input = screen.getByDisplayValue("Test Site");
    await userEvent.clear(input);
    await userEvent.type(input, "Saved Site");

    // Click save
    const saveButton = screen.getByRole("button", { name: "儲存" });
    await userEvent.click(saveButton);

    expect(fetchMock).toHaveBeenCalledWith("/api/site-settings", expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("Saved Site")
    }));
  });

  it("handles save error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: "Server Error" }),
    });

    render(<SiteSettingsForm initialSettings={mockSettings} categories={mockCategories} />);
    
    const saveButton = screen.getByRole("button", { name: "儲存" });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Server Error")).toBeInTheDocument();
    });
  });

  it("handles category updates", async () => {
    render(<SiteSettingsForm initialSettings={mockSettings} categories={mockCategories} />);
    
    await userEvent.click(screen.getByText("分類管理"));
    
    // Toggle showInNav
    const checkbox = screen.getAllByRole("checkbox")[0];
    await userEvent.click(checkbox);
    
    // Change order
    const numberInput = screen.getByDisplayValue("1");
    await userEvent.clear(numberInput);
    await userEvent.type(numberInput, "2");

    // TODO: Verify state update? Or just verify save payload includes changes
    // But testing state update in valid way requires inspecting payload on save
    
    fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
    });

    await userEvent.click(screen.getByRole("button", { name: "儲存" }));

    await waitFor(() => {
        expect(screen.getByText("已儲存")).toBeInTheDocument();
    });

    // Verify categories update call
    // Logic: maps categories to fetch calls
    expect(fetchMock).toHaveBeenCalledWith("/api/categories/1", expect.anything());
  });
});

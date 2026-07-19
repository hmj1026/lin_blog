import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  showAbout: false,
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

describe("SiteSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("renders with initial settings", () => {
    render(<SiteSettingsForm initialSettings={mockSettings} />);
    expect(screen.getByDisplayValue("Test Site")).toBeInTheDocument();
  });

  it("switches tabs", async () => {
    render(<SiteSettingsForm initialSettings={mockSettings} />);
    
    // Switch to Hero tab
    await userEvent.click(screen.getByText("Hero 區塊"));
    expect(screen.getByText("Hero 區塊設定")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hero Title")).toBeInTheDocument();

    expect(screen.queryByText("分類管理")).not.toBeInTheDocument();
  });

  it("updates site name", async () => {
    render(<SiteSettingsForm initialSettings={mockSettings} />);
    
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

    render(<SiteSettingsForm initialSettings={mockSettings} />);
    
    // Change a value
    const input = screen.getByDisplayValue("Test Site");
    await userEvent.clear(input);
    await userEvent.type(input, "Saved Site");

    // Click save
    const saveButton = screen.getByRole("button", { name: "儲存此區" });
    await userEvent.click(saveButton);

    expect(fetchMock).toHaveBeenCalledWith("/api/site-settings", expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("Saved Site")
    }));
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    // 只送出實際變動的欄位；未變動的 showBlogLink 不應被夾帶送出。
    expect(body).toEqual({ siteName: "Saved Site" });
    expect(screen.getByText(/上次儲存/)).toBeInTheDocument();
  });

  it("handles save error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: "Server Error" }),
    });

    render(<SiteSettingsForm initialSettings={mockSettings} />);
    
    await userEvent.type(screen.getByDisplayValue("Test Site"), " unsaved");
    const saveButton = screen.getByRole("button", { name: "儲存此區" });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Server Error")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Test Site unsaved")).toBeInTheDocument();
  });

  it("renders newsletter checkbox reflecting initial state", () => {
    render(<SiteSettingsForm initialSettings={mockSettings} />);

    const checkbox = screen.getByLabelText("顯示 Newsletter 訂閱區塊");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it("toggles newsletter checkbox and submits updated value", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SiteSettingsForm initialSettings={mockSettings} />);

    const checkbox = screen.getByLabelText("顯示 Newsletter 訂閱區塊");
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const saveButton = screen.getByRole("button", { name: "儲存此區" });
    await userEvent.click(saveButton);

    expect(fetchMock).toHaveBeenCalledWith("/api/site-settings", expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining('"showNewsletter":true'),
    }));
  });

  it("將關於我開關納入一般設定 dirty state 與分區保存", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(<SiteSettingsForm initialSettings={mockSettings} />);

    await userEvent.click(screen.getByLabelText("顯示「關於我」"));
    const saveButton = screen.getByRole("button", { name: "儲存此區" });
    expect(saveButton).toBeEnabled();
    await userEvent.click(saveButton);

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({ showAbout: true });
  });

  it("僅在 showBlogLink 實際變動時送出，不覆寫其他管理員的併發變更", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
    render(<SiteSettingsForm initialSettings={mockSettings} />);

    // 只變更 Hero 分區欄位並儲存：payload 不應包含未變動的 showBlogLink。
    await userEvent.click(screen.getByText("Hero 區塊"));
    const heroTitle = screen.getByDisplayValue("Hero Title");
    await userEvent.clear(heroTitle);
    await userEvent.type(heroTitle, "New Hero");
    await userEvent.click(screen.getByRole("button", { name: "儲存此區" }));

    const heroBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(heroBody).toEqual({ heroTitle: "New Hero" });
    expect(heroBody).not.toHaveProperty("showBlogLink");

    // 實際切換 showBlogLink 後儲存：payload 才會帶上該欄位。
    await userEvent.click(screen.getByText("一般設定"));
    await userEvent.click(screen.getByLabelText("顯示「部落格」連結"));
    await userEvent.click(screen.getByRole("button", { name: "儲存此區" }));

    expect(JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string)).toEqual({ showBlogLink: false });
  });

  it("儲存請求進行中再次修改同欄位時，新值仍維持 dirty（不被誤標為已儲存）", async () => {
    let resolveSave: (value: unknown) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((resolve) => {
      resolveSave = resolve;
    }));

    render(<SiteSettingsForm initialSettings={mockSettings} />);
    const input = screen.getByDisplayValue("Test Site");
    await userEvent.clear(input);
    await userEvent.type(input, "First");

    // 送出儲存（請求 pending）。
    await userEvent.click(screen.getByRole("button", { name: "儲存此區" }));

    // 請求尚未回應時再次把同一欄位改成不同值。
    await userEvent.clear(input);
    await userEvent.type(input, "Second");

    // 解析儲存請求（回傳的是送出當下的舊值 "First"）。
    await act(async () => {
      resolveSave({ ok: true, json: async () => ({ success: true }) });
    });

    // 新值 "Second" 必須仍為 dirty：儲存鈕啟用、顯示未儲存變更、輸入維持新值，不被誤標為已儲存。
    await waitFor(() => expect(screen.getByRole("button", { name: "儲存此區" })).toBeEnabled());
    expect(screen.getByText("有未儲存變更")).toBeInTheDocument();
    expect(input).toHaveValue("Second");
  });

  it("shows dirty state, can cancel changes, and previews pending desktop/mobile values", async () => {
    render(<SiteSettingsForm initialSettings={mockSettings} />);
    const input = screen.getByDisplayValue("Test Site");
    expect(screen.getByRole("button", { name: "儲存此區" })).toBeDisabled();

    await userEvent.clear(input);
    await userEvent.type(input, "Pending Site");
    expect(screen.getByText("有未儲存變更")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "預覽變更" }));
    expect(screen.getByTestId("settings-preview-desktop")).toHaveTextContent("Pending Site");
    expect(screen.getByTestId("settings-preview-mobile")).toHaveTextContent("Pending Site");

    await userEvent.click(screen.getByRole("button", { name: "取消變更" }));
    expect(input).toHaveValue("Test Site");
  });
});

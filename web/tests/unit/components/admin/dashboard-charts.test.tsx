import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardCharts } from "@/components/admin/dashboard-charts";

// Mock fetch
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const mockStats = {
  trend: [
    { date: "2023-01-01", count: 10 },
    { date: "2023-01-02", count: 20 },
  ],
  topPosts: [
    { postId: "1", slug: "post-1", title: "Post One", count: 100 },
  ],
  devices: [{ type: "Desktop", count: 50 }, { type: "Mobile", count: 50 }],
  browsers: [{ name: "Chrome", count: 80 }, { name: "Safari", count: 20 }],
  os: [{ name: "Windows", count: 60 }, { name: "Mac", count: 40 }],
  sources: [
    { source: "ORGANIC_SEARCH", name: "自然搜尋", count: 18 },
    { source: "DIRECT_UNKNOWN", name: "直接／未知", count: 12 },
  ],
  comparison: { current: 30, previous: 20, percentChange: 50 },
  period: { days: 7, timeZone: "Asia/Taipei" },
};

describe("DashboardCharts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("starts the initial request during the first effect flush", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<DashboardCharts />);

    expect(fetchMock).toHaveBeenCalledWith("/api/analytics/stats?days=7");
  });

  it("loads and displays charts", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockStats }),
    });

    render(<DashboardCharts />);
    
    expect(screen.getByText("載入中...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("瀏覽趨勢")).toBeInTheDocument();
    });

    expect(screen.getByText("熱門文章")).toBeInTheDocument();
    expect(screen.getByText("Post One")).toBeInTheDocument();
    expect(screen.getByText("100 次")).toBeInTheDocument();

    expect(screen.getByText("訪客分析")).toBeInTheDocument();
    expect(screen.getByText("Desktop")).toBeInTheDocument();
    expect(screen.getByText("本期瀏覽")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("較前期 +50%")).toBeInTheDocument();
    expect(screen.getByText("流量來源")).toBeInTheDocument();
    expect(screen.getByText("自然搜尋")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "每日瀏覽文字資料" })).toBeInTheDocument();
  });

  it("switches tabs in visitor analysis", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockStats }),
    });

    render(<DashboardCharts />);
    await waitFor(() => expect(screen.getByText("訪客分析")).toBeInTheDocument());

    // Switch to Browser
    const browserTab = screen.getByText("瀏覽器");
    await userEvent.click(browserTab);
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.queryByText("Desktop")).not.toBeInTheDocument();

    // Switch to OS
    const osTab = screen.getByText("系統");
    await userEvent.click(osTab);
    expect(screen.getByText("Windows")).toBeInTheDocument();
  });

  it("changes duration (days)", async () => {
     fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockStats }),
    });

    render(<DashboardCharts />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/analytics/stats?days=7"));

    const day30Btn = screen.getByText("30 天");
    await userEvent.click(day30Btn);

    expect(fetchMock).toHaveBeenCalledWith("/api/analytics/stats?days=30");
  });

  it("shows an accessible error and retries the failed request", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats }),
      });

    render(<DashboardCharts />);

    expect(await screen.findByRole("alert")).toHaveTextContent("無法載入分析資料");
    await userEvent.click(screen.getByRole("button", { name: "重新載入" }));

    expect(await screen.findByText("瀏覽趨勢")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

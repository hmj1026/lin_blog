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
};

describe("DashboardCharts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
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
});

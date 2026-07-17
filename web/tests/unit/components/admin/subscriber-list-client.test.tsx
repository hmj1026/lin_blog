import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriberListClient } from "@/components/admin/subscriber-list-client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function okResponse(data: unknown) {
  return { ok: true, json: async () => ({ success: true, data }) };
}

function errorResponse(status: number, message = "系統發生錯誤，請稍後再試") {
  return { ok: false, status, json: async () => ({ success: false, message }) };
}

const mockSubscribers = [
  { id: "s1", name: "Reader One", email: "reader1@example.com", createdAt: "2026-01-02T03:04:05.000Z" },
  { id: "s2", name: "Reader Two", email: "reader2@example.com", createdAt: "2026-01-03T03:04:05.000Z" },
];

describe("SubscriberListClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("starts the initial request during the first effect flush", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    render(<SubscriberListClient />);

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/subscribers?page=1&pageSize=20");
  });

  it("shows a loading state before the first fetch resolves", async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((resolve) => { resolveFetch = resolve; }));

    render(<SubscriberListClient />);

    expect(screen.getByText("載入中...")).toBeInTheDocument();

    resolveFetch(okResponse({ items: [], total: 0, page: 1, pageSize: 20 }));
    await waitFor(() => expect(screen.queryByText("載入中...")).not.toBeInTheDocument());
  });

  it("shows an empty state when there are no subscribers", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ items: [], total: 0, page: 1, pageSize: 20 }));

    render(<SubscriberListClient />);

    await waitFor(() => expect(screen.getByText("目前沒有訂閱者")).toBeInTheDocument());
  });

  it("shows a generic error state when the request fails", async () => {
    fetchMock.mockResolvedValueOnce(errorResponse(500));

    render(<SubscriberListClient />);

    await waitFor(() => expect(screen.getByText("系統發生錯誤，請稍後再試")).toBeInTheDocument());
  });

  it("shows a generic error state when fetch itself throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    render(<SubscriberListClient />);

    await waitFor(() => expect(screen.getByText(/系統發生錯誤/)).toBeInTheDocument());
  });

  it("renders subscriber name, email and localized createdAt", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ items: mockSubscribers, total: 2, page: 1, pageSize: 20 }));

    render(<SubscriberListClient />);

    await waitFor(() => expect(screen.getByText("Reader One")).toBeInTheDocument());
    expect(screen.getByText("reader1@example.com")).toBeInTheDocument();
    // 依環境時區呈現，僅驗證日期部分避免測試因時區而 flaky（比照既有 admin-analytics-pages 慣例）
    expect(screen.getAllByText(/2026-01-0[23]/).length).toBeGreaterThan(0);
  });

  it("re-fetches with the trimmed search term when the search form is submitted", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ items: mockSubscribers, total: 2, page: 1, pageSize: 20 }));
    render(<SubscriberListClient />);
    await waitFor(() => expect(screen.getByText("Reader One")).toBeInTheDocument());

    fetchMock.mockResolvedValueOnce(
      okResponse({ items: [mockSubscribers[0]], total: 1, page: 1, pageSize: 20 })
    );

    const searchInput = screen.getByLabelText("搜尋姓名或 Email");
    await userEvent.type(searchInput, "  reader1  ");
    await userEvent.click(screen.getByRole("button", { name: "搜尋" }));

    await waitFor(() => {
      const lastCall = fetchMock.mock.calls.at(-1)?.[0] as string;
      expect(lastCall).toContain("q=reader1");
    });
    await waitFor(() => expect(screen.queryByText("Reader Two")).not.toBeInTheDocument());
  });

  it("preserves the current search term across pagination", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ items: mockSubscribers, total: 40, page: 1, pageSize: 20 }));
    render(<SubscriberListClient />);
    await waitFor(() => expect(screen.getByText("Reader One")).toBeInTheDocument());

    const searchInput = screen.getByLabelText("搜尋姓名或 Email");
    await userEvent.type(searchInput, "reader");
    fetchMock.mockResolvedValueOnce(okResponse({ items: mockSubscribers, total: 40, page: 1, pageSize: 20 }));
    await userEvent.click(screen.getByRole("button", { name: "搜尋" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    fetchMock.mockResolvedValueOnce(okResponse({ items: mockSubscribers, total: 40, page: 2, pageSize: 20 }));
    await userEvent.click(screen.getByRole("button", { name: "下一頁" }));

    await waitFor(() => {
      const lastCall = fetchMock.mock.calls.at(-1)?.[0] as string;
      expect(lastCall).toContain("q=reader");
      expect(lastCall).toContain("page=2");
    });
  });

  it("disables the previous-page button on the first page and next-page button on the last page", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ items: mockSubscribers, total: 2, page: 1, pageSize: 20 }));
    render(<SubscriberListClient />);
    await waitFor(() => expect(screen.getByText("Reader One")).toBeInTheDocument());

    expect(screen.getByRole("button", { name: "上一頁" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "下一頁" })).toBeDisabled();
  });

  it("never renders export, delete, or bulk-send actions", async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ items: mockSubscribers, total: 2, page: 1, pageSize: 20 }));

    render(<SubscriberListClient />);

    await waitFor(() => expect(screen.getByText("Reader One")).toBeInTheDocument());

    expect(screen.queryByText(/匯出/)).not.toBeInTheDocument();
    expect(screen.queryByText(/刪除/)).not.toBeInTheDocument();
    expect(screen.queryByText(/群發/)).not.toBeInTheDocument();
    expect(screen.queryByText(/寄信/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /export/i })).not.toBeInTheDocument();
  });
});

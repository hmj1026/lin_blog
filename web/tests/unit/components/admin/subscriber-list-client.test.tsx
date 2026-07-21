import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SubscriberListClient } from "@/components/admin/subscriber-list-client";

const refreshMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
Object.assign(navigator, { clipboard: { writeText: vi.fn() } });

const items = [
  { id: "s1", name: "Reader One", email: "reader1@example.com", createdAt: "2026-01-02T03:04:05.000Z" },
  { id: "s2", name: "Reader Two", email: "reader2@example.com", createdAt: "2026-01-03T03:04:05.000Z" },
];

describe("SubscriberListClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("呈現 URL 驅動 GET 搜尋、分頁與 aggregate growth", () => {
    render(<SubscriberListClient items={items} filters={{ search: "reader" }} pagination={{ page: 2, pageSize: 20, total: 40, totalPages: 2 }} growth={{ last7Days: 3, last30Days: 9 }} />);

    expect(screen.getByRole("searchbox", { name: "搜尋姓名或 Email" })).toHaveValue("reader");
    expect(screen.getByRole("link", { name: "上一頁" })).toHaveAttribute("href", expect.stringContaining("q=reader"));
    expect(screen.getByText("近 7 天新增 3 位")).toBeInTheDocument();
    expect(screen.getByText("近 30 天新增 9 位")).toBeInTheDocument();
  });

  it("可單筆複製 email 並顯示成功回饋", async () => {
    render(<SubscriberListClient items={items} filters={{ search: "" }} pagination={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }} growth={{ last7Days: 0, last30Days: 0 }} />);

    await userEvent.click(screen.getAllByRole("button", { name: /複製.*Email/ })[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("reader1@example.com");
    expect(screen.getByRole("status")).toHaveTextContent("已複製");
  });

  it("載入失敗時提供 retry 且不顯示 PII", async () => {
    render(<SubscriberListClient items={[]} filters={{ search: "reader" }} pagination={{ page: 1, pageSize: 20, total: 0, totalPages: 1 }} growth={{ last7Days: 0, last30Days: 0 }} loadError />);

    expect(screen.getByRole("alert")).toHaveTextContent("系統發生錯誤");
    expect(screen.queryByText("reader1@example.com")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "重新載入" }));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("不提供批次複製、匯出、刪除或群發", () => {
    render(<SubscriberListClient items={items} filters={{ search: "" }} pagination={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }} growth={{ last7Days: 0, last30Days: 0 }} />);

    expect(screen.queryByText(/批次複製|匯出|刪除|群發|寄信/)).not.toBeInTheDocument();
  });
});

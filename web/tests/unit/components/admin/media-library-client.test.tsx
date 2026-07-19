import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MediaLibraryClient } from "@/components/admin/media-library-client";

const fetchMock = vi.fn();
const refreshMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
Object.assign(navigator, { clipboard: { writeText: vi.fn() } });

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("next/image", () => ({ default: (props: any) => <img {...props} alt={props.alt} /> }));

const uploads = [
  { id: "1", originalName: "image1.jpg", mimeType: "image/jpeg", size: 512000, createdAt: "2023-01-01T10:00:00Z", src: "/api/files/1" },
  { id: "2", originalName: "doc.pdf", mimeType: "application/pdf", size: 2097152, createdAt: "2023-01-02T10:00:00Z", src: "/api/files/2" },
];

const renderLibrary = () => render(
  <MediaLibraryClient
    initialUploads={uploads}
    filters={{ search: "hero", type: "image/" }}
    pagination={{ page: 2, pageSize: 20, total: 21, totalPages: 2 }}
  />,
);

describe("MediaLibraryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it("直接呈現伺服器資料與可分享的 GET 篩選表單", () => {
    renderLibrary();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("image1.jpg")).toBeInTheDocument();
    expect(screen.getByText("doc.pdf")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "搜尋媒體檔案" })).toHaveValue("hero");
    expect(screen.getByRole("combobox", { name: "媒體類型" })).toHaveValue("image/");
    expect(screen.getByRole("link", { name: "上一頁" })).toHaveAttribute("href", expect.stringContaining("q=hero"));
    expect(screen.getByText("共 21 個檔案")).toBeInTheDocument();
  });

  it("在 props 變更時同步媒體清單（上傳後重新整理或分頁導航）", () => {
    const { rerender } = render(
      <MediaLibraryClient
        initialUploads={uploads}
        filters={{ search: "", type: "" }}
        pagination={{ page: 1, pageSize: 20, total: 2, totalPages: 1 }}
      />,
    );
    expect(screen.getByText("image1.jpg")).toBeInTheDocument();

    const nextUploads = [
      { id: "3", originalName: "fresh.png", mimeType: "image/png", size: 1024, createdAt: "2023-02-01T10:00:00Z", src: "/api/files/3" },
    ];
    rerender(
      <MediaLibraryClient
        initialUploads={nextUploads}
        filters={{ search: "", type: "" }}
        pagination={{ page: 1, pageSize: 20, total: 1, totalPages: 1 }}
      />,
    );

    expect(screen.getByText("fresh.png")).toBeInTheDocument();
    expect(screen.queryByText("image1.jpg")).not.toBeInTheDocument();
  });

  it("顯示檔案詳情", async () => {
    renderLibrary();

    await userEvent.click(screen.getAllByRole("button", { name: "查看詳情" })[0]);

    expect(screen.getByRole("region", { name: "image1.jpg 詳情" })).toHaveTextContent("image/jpeg");
    expect(screen.getByRole("region", { name: "image1.jpg 詳情" })).toHaveTextContent("/api/files/1");
  });

  it("上傳檔案後顯示成功回饋並重新整理伺服器資料", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { id: "3", src: "/api/files/3" } }) });
    renderLibrary();
    const file = new File(["image"], "new.png", { type: "image/png" });

    await userEvent.upload(screen.getByLabelText("上傳媒體檔案"), file);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/uploads", expect.objectContaining({ method: "POST" })));
    expect(await screen.findByRole("status")).toHaveTextContent("已上傳");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("複製連結並顯示回饋", async () => {
    renderLibrary();

    await userEvent.click(screen.getAllByRole("button", { name: "複製連結" })[0]);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("/api/files/1");
    expect(screen.getByRole("status")).toHaveTextContent("已複製");
  });

  it("確認無引用後刪除媒體", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { upload: uploads[0], references: [] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { message: "檔案已刪除" } }) });
    renderLibrary();

    await userEvent.click(screen.getAllByRole("button", { name: "刪除" })[0]);
    await userEvent.click(await screen.findByRole("button", { name: "確認刪除" }));

    await waitFor(() => expect(screen.queryByText("image1.jpg")).not.toBeInTheDocument());
  });

  it("以人工檢查資訊阻擋可能的 Raw HTML 引用", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: { upload: uploads[0], references: [{ label: "Raw HTML 可能引用：嵌入碼（需人工檢查）" }] } }) });
    renderLibrary();

    await userEvent.click(screen.getAllByRole("button", { name: "刪除" })[0]);

    expect(await screen.findByRole("alert")).toHaveTextContent("需人工檢查");
    expect(screen.queryByRole("button", { name: "確認刪除" })).not.toBeInTheDocument();
  });
});

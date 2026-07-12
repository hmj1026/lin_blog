import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadImageBlob } from "@/lib/media/upload-image";

describe("uploadImageBlob", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts a FormData blob to /api/uploads and returns the relative src on success", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: { src: "/api/files/abc123" },
      }),
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const blob = new Blob(["fake-image-data"], { type: "image/jpeg" });
    const result = await uploadImageBlob(blob, "photo.jpg");

    expect(result).toEqual({ src: "/api/files/abc123" });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/uploads");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("throws when the HTTP response is not ok", async () => {
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue({ success: false, message: "上傳失敗" }),
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const blob = new Blob(["fake-image-data"], { type: "image/jpeg" });
    await expect(uploadImageBlob(blob, "photo.jpg")).rejects.toThrow("上傳失敗");
  });

  it("throws when success is false even if the HTTP response is ok", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ success: false, message: "檔案格式錯誤" }),
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const blob = new Blob(["fake-image-data"], { type: "image/jpeg" });
    await expect(uploadImageBlob(blob, "photo.jpg")).rejects.toThrow("檔案格式錯誤");
  });

  it("throws when data.src is missing so editor content is never mutated on failure", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, data: {} }),
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

    const blob = new Blob(["fake-image-data"], { type: "image/jpeg" });
    await expect(uploadImageBlob(blob, "photo.jpg")).rejects.toThrow();
  });
});

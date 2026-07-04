import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/files/[id]/route";

vi.mock("@/lib/server-queries", () => ({
  mediaQueries: {
    getUploadById: vi.fn(),
  },
}));

vi.mock("@/modules/media", () => ({
  mediaUseCases: {
    openFileStream: vi.fn(),
  },
}));

import { mediaQueries } from "@/lib/server-queries";
import { mediaUseCases } from "@/modules/media";

describe("GET /api/files/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves a PUBLIC file without auth", async () => {
    (mediaQueries.getUploadById as any).mockResolvedValue({
      visibility: "PUBLIC",
      deletedAt: null,
      storageKey: "k1",
      mimeType: "image/png",
    });
    (mediaUseCases.openFileStream as any).mockResolvedValue({
      ok: true,
      stream: new ReadableStream(),
      contentType: "image/png",
      contentLength: 3,
    });

    const res = await GET({} as any, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(mediaUseCases.openFileStream).toHaveBeenCalledWith("k1");
  });

  it("denies a non-PUBLIC file and returns no content", async () => {
    (mediaQueries.getUploadById as any).mockResolvedValue({
      visibility: "PRIVATE",
      deletedAt: null,
      storageKey: "k1",
      mimeType: "image/png",
    });

    const res = await GET({} as any, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
    expect(mediaUseCases.openFileStream).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing file id", async () => {
    (mediaQueries.getUploadById as any).mockResolvedValue(null);

    const res = await GET({} as any, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

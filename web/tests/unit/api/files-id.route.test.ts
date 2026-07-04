import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/files/[id]/route";

vi.mock("@/modules/media", () => ({
  mediaUseCases: {
    getUploadById: vi.fn(),
  },
}));

vi.mock("@/modules/media/infrastructure/storage", () => ({
  getStorageAdapter: vi.fn(),
  StorageError: class extends Error {
    code: string;
    constructor(m: string, c: string = "UNKNOWN") {
      super(m);
      this.code = c;
    }
  },
}));

import { mediaUseCases } from "@/modules/media";
import { getStorageAdapter } from "@/modules/media/infrastructure/storage";

describe("GET /api/files/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serves a PUBLIC file without auth", async () => {
    (mediaUseCases.getUploadById as any).mockResolvedValue({
      visibility: "PUBLIC",
      deletedAt: null,
      storageKey: "k1",
      mimeType: "image/png",
    });

    const mockStorage = {
      getObjectStream: vi.fn().mockResolvedValue({
        stream: new ReadableStream(),
        contentType: "image/png",
        contentLength: 3,
      }),
    };
    (getStorageAdapter as any).mockReturnValue(mockStorage);

    const res = await GET({} as any, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(mockStorage.getObjectStream).toHaveBeenCalledWith({ key: "k1" });
  });

  it("denies a non-PUBLIC file and returns no content", async () => {
    (mediaUseCases.getUploadById as any).mockResolvedValue({
      visibility: "PRIVATE",
      deletedAt: null,
      storageKey: "k1",
      mimeType: "image/png",
    });

    const res = await GET({} as any, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(403);
    expect(getStorageAdapter).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing file id", async () => {
    (mediaUseCases.getUploadById as any).mockResolvedValue(null);

    const res = await GET({} as any, { params: Promise.resolve({ id: "missing" }) });
    expect(res.status).toBe(404);
  });
});

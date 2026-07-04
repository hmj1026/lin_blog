import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

vi.mock("@/lib/api-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-utils")>();
  return {
    ...actual,
    requirePermission: vi.fn().mockResolvedValue(null),
  };
});

let capturedUploadData: any = null;

vi.mock("@/lib/db", () => ({
  prisma: {
    upload: {
      create: vi.fn(({ data }: { data: any }) => {
        capturedUploadData = data;
        return Promise.resolve({
          id: "test-upload-id",
          ...data,
          deletedAt: null,
          createdAt: new Date(),
        });
      }),
    },
  },
}));

vi.mock("@/lib/server-queries", () => ({
  mediaQueries: {
    getUploadById: vi.fn(),
  },
}));

import { POST } from "@/app/api/uploads/route";
import { GET } from "@/app/api/files/[id]/route";
import { mediaQueries } from "@/lib/server-queries";
import {
  setStorageAdapter,
  resetStorageAdapter,
  LocalStorageAdapter,
} from "@/modules/media/infrastructure/storage";

describe("uploads/files integration (real LocalStorageAdapter)", () => {
  let tmpDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedUploadData = null;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "uploads-files-integration-"));
    setStorageAdapter(new LocalStorageAdapter({ rootDir: tmpDir }));
  });

  afterEach(() => {
    resetStorageAdapter();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("round-trips a non-image file's exact bytes through POST /api/uploads and GET /api/files/[id]", async () => {
    const content = "hello storage adapter";
    const file = new File([content], "hello.txt", { type: "text/plain" });
    // jsdom's File does not implement arrayBuffer(); polyfill it with the real bytes.
    Object.defineProperty(file, "arrayBuffer", {
      value: async () => new TextEncoder().encode(content).buffer,
    });
    const postRequest = {
      formData: async () => ({
        get: (key: string) => (key === "file" ? file : null),
      }),
    } as unknown as Request;

    const postRes = await POST(postRequest);
    const postJson = await postRes.json();
    expect(postRes.status).toBe(200);
    expect(postJson.success).toBe(true);
    expect(postJson.data.id).toBe("test-upload-id");
    expect(postJson.data.src).toBe("/api/files/test-upload-id");

    expect(capturedUploadData).not.toBeNull();
    const storageKey = capturedUploadData.storageKey as string;
    const writtenPath = path.join(tmpDir, storageKey);
    expect(fs.existsSync(writtenPath)).toBe(true);

    (mediaQueries.getUploadById as any).mockResolvedValue({
      visibility: "PUBLIC",
      deletedAt: null,
      storageKey,
      mimeType: "text/plain",
    });

    const getRes = await GET({} as any, { params: Promise.resolve({ id: "test-upload-id" }) });
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Content-Type")).toContain("text/plain");
    const body = await getRes.text();
    expect(body).toBe(content);
  });

  it("returns 403 for a non-PUBLIC upload", async () => {
    (mediaQueries.getUploadById as any).mockResolvedValue({
      visibility: "PRIVATE",
      deletedAt: null,
      storageKey: "uploads/whatever.txt",
      mimeType: "text/plain",
    });

    const getRes = await GET({} as any, { params: Promise.resolve({ id: "test-upload-id" }) });
    expect(getRes.status).toBe(403);
  });
});

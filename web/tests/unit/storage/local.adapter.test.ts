import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorageAdapter } from "@/modules/media/infrastructure/storage/local.adapter";
import { StorageError } from "@/modules/media/infrastructure/storage/adapter.interface";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { Readable } from "stream";

vi.mock("fs", () => ({
  default: {
    createReadStream: vi.fn(),
    existsSync: vi.fn(),
  },
  createReadStream: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
  },
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
  stat: vi.fn(),
}));

describe("LocalStorageAdapter", () => {
  const rootDir = path.join(process.cwd(), "storage");
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new LocalStorageAdapter();
  });

  describe("putObject", () => {
    it("writes buffer to file", async () => {
      const buffer = Buffer.from("test");
      await adapter.putObject({ key: "test.txt", body: buffer, contentType: "text/plain" });

      expect(fsp.mkdir).toHaveBeenCalledWith(rootDir, { recursive: true });
      expect(fsp.writeFile).toHaveBeenCalledWith(path.join(rootDir, "test.txt"), buffer);
    });

    it("writes stream to file", async () => {
      const stream = Readable.from(["test"]);
      await adapter.putObject({ key: "stream.txt", body: stream, contentType: "text/plain" });

      expect(fsp.writeFile).toHaveBeenCalledWith(
        path.join(rootDir, "stream.txt"),
        expect.any(Buffer)
      );
    });

    it("prevents path traversal", async () => {
      await expect(
        adapter.putObject({ key: "../hack.txt", body: Buffer.from("hack"), contentType: "text/plain" })
      ).rejects.toThrow(StorageError);
    });

    it("handles write errors", async () => {
      (fsp.writeFile as any).mockRejectedValue(new Error("Disk full"));
      await expect(
        adapter.putObject({ key: "test.txt", body: Buffer.from("test"), contentType: "text/plain" })
      ).rejects.toThrow("Failed to write object");
    });
  });

  describe("getObjectStream", () => {
    it("returns stream if file exists", async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fsp.stat as any).mockResolvedValue({ size: 100 });
      const mockStream = new Readable();
      (fs.createReadStream as any).mockReturnValue(mockStream);

      const result = await adapter.getObjectStream({ key: "test.txt" });

      expect(result.stream).toBe(mockStream);
      expect(result.contentLength).toBe(100);
    });

    it("throws NOT_FOUND if file missing", async () => {
      (fs.existsSync as any).mockReturnValue(false);
      await expect(adapter.getObjectStream({ key: "missing.txt" })).rejects.toThrow(/Object not found/);
    });

    it("handles read errors", async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fsp.stat as any).mockRejectedValue(new Error("Permission denied"));
      await expect(adapter.getObjectStream({ key: "test.txt" })).rejects.toThrow("Failed to read object");
    });
  });

  describe("deleteObject", () => {
    it("deletes existing file", async () => {
      (fs.existsSync as any).mockReturnValue(true);
      await adapter.deleteObject({ key: "test.txt" });
      expect(fsp.unlink).toHaveBeenCalledWith(path.join(rootDir, "test.txt"));
    });

    it("ignores missing file", async () => {
      (fs.existsSync as any).mockReturnValue(false);
      await adapter.deleteObject({ key: "missing.txt" });
      expect(fsp.unlink).not.toHaveBeenCalled();
    });

    it("handles delete errors", async () => {
      (fs.existsSync as any).mockReturnValue(true);
      (fsp.unlink as any).mockRejectedValue(new Error("Locked"));
      await expect(adapter.deleteObject({ key: "test.txt" })).rejects.toThrow("Failed to delete object");
    });
  });
});

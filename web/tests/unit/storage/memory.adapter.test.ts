import { describe, expect, it, beforeEach } from "vitest";
import { Readable } from "stream";
import { InMemoryStorageAdapter } from "@/modules/media/infrastructure/storage/memory.adapter";
import { StorageError } from "@/modules/media/infrastructure/storage/adapter.interface";

describe("InMemoryStorageAdapter", () => {
  let adapter: InMemoryStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  describe("putObject", () => {
    it("成功儲存 Buffer", async () => {
      const buffer = Buffer.from("hello world");
      const result = await adapter.putObject({
        key: "test/file.txt",
        contentType: "text/plain",
        body: buffer,
      });

      expect(result.size).toBe(buffer.length);
      expect(adapter.has("test/file.txt")).toBe(true);
    });

    it("成功儲存 Readable stream", async () => {
      const content = "stream content";
      const stream = Readable.from(content);
      const result = await adapter.putObject({
        key: "test/stream.txt",
        contentType: "text/plain",
        body: stream,
      });

      expect(result.size).toBe(content.length);
      expect(adapter.getBuffer("test/stream.txt")?.toString()).toBe(content);
    });

    it("覆寫既有的 key", async () => {
      await adapter.putObject({
        key: "test/file.txt",
        contentType: "text/plain",
        body: Buffer.from("v1"),
      });
      await adapter.putObject({
        key: "test/file.txt",
        contentType: "text/plain",
        body: Buffer.from("v2"),
      });

      expect(adapter.getBuffer("test/file.txt")?.toString()).toBe("v2");
    });
  });

  describe("getObjectStream", () => {
    it("成功取得已存在的物件", async () => {
      const content = "test content";
      await adapter.putObject({
        key: "test/file.txt",
        contentType: "image/png",
        body: Buffer.from(content),
      });

      const result = await adapter.getObjectStream({ key: "test/file.txt" });

      expect(result.contentType).toBe("image/png");
      expect(result.contentLength).toBe(content.length);

      // 讀取 stream 內容
      const chunks: Buffer[] = [];
      for await (const chunk of result.stream as Readable) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      expect(Buffer.concat(chunks).toString()).toBe(content);
    });

    it("物件不存在時拋出 NOT_FOUND 錯誤", async () => {
      await expect(
        adapter.getObjectStream({ key: "nonexistent" })
      ).rejects.toThrow(StorageError);

      try {
        await adapter.getObjectStream({ key: "nonexistent" });
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).code).toBe("NOT_FOUND");
      }
    });
  });

  describe("deleteObject", () => {
    it("成功刪除已存在的物件", async () => {
      await adapter.putObject({
        key: "test/file.txt",
        contentType: "text/plain",
        body: Buffer.from("content"),
      });
      expect(adapter.has("test/file.txt")).toBe(true);

      await adapter.deleteObject({ key: "test/file.txt" });
      expect(adapter.has("test/file.txt")).toBe(false);
    });

    it("刪除不存在的物件不拋錯（idempotent）", async () => {
      await expect(
        adapter.deleteObject({ key: "nonexistent" })
      ).resolves.toBeUndefined();
    });
  });

  describe("測試輔助方法", () => {
    it("clear() 清空所有物件", async () => {
      await adapter.putObject({
        key: "a",
        contentType: "text/plain",
        body: Buffer.from("a"),
      });
      await adapter.putObject({
        key: "b",
        contentType: "text/plain",
        body: Buffer.from("b"),
      });
      expect(adapter.size).toBe(2);

      adapter.clear();
      expect(adapter.size).toBe(0);
    });
  });
});

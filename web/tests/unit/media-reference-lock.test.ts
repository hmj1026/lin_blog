import { describe, it, expect, vi } from "vitest";
import {
  extractReferencedUploadIds,
  assertReferencedMediaUsable,
  DeletedMediaReferenceError,
} from "@/lib/media-reference-lock";

describe("extractReferencedUploadIds", () => {
  it("從欄位值萃取 /api/files/<id> 引用並去重", () => {
    expect(
      extractReferencedUploadIds([
        "/api/files/abc123",
        '<p><img src="/api/files/abc123"><img src="/api/files/def-456"></p>',
        null,
        undefined,
        "no media here",
      ])
    ).toEqual(["abc123", "def-456"]);
  });

  it("無引用時回傳空陣列", () => {
    expect(extractReferencedUploadIds([null, undefined, "text"])).toEqual([]);
  });

  it("同一字串內重複引用同一 ID 時去重", () => {
    expect(
      extractReferencedUploadIds(['<img src="/api/files/abc123"><img src="/api/files/abc123">'])
    ).toEqual(["abc123"]);
  });

  it("複合 HTML 格式：srcset、background-image、多屬性標籤內皆能萃取", () => {
    expect(
      extractReferencedUploadIds([
        '<img srcset="/api/files/small-1 480w, /api/files/large-2 1024w" src="/api/files/large-2">',
        '<div style="background-image: url(/api/files/bg-9)" class="hero" data-id="1"></div>',
      ])
    ).toEqual(["small-1", "large-2", "bg-9"]);
  });

  it("形似但不符合前綴的路徑不視為引用", () => {
    expect(
      extractReferencedUploadIds([
        "xapi/files/abc",
        "/api/other-files/abc",
        "/apifiles/abc",
        "/api/files/",
      ])
    ).toEqual([]);
  });
});

describe("assertReferencedMediaUsable", () => {
  function makeTx(deleted: Array<{ id: string }>) {
    return { upload: { findMany: vi.fn(async () => deleted) } } as never;
  }

  it("無引用時不查詢資料庫", async () => {
    const tx = { upload: { findMany: vi.fn() } } as never;
    await assertReferencedMediaUsable(tx, ["plain text", null]);
    expect((tx as { upload: { findMany: ReturnType<typeof vi.fn> } }).upload.findMany).not.toHaveBeenCalled();
  });

  it("引用皆存活時放行", async () => {
    await expect(assertReferencedMediaUsable(makeTx([]), ["/api/files/u1"])).resolves.toBeUndefined();
  });

  it("引用已軟刪除媒體時拋出 409 錯誤並列出 ID", async () => {
    const error = await assertReferencedMediaUsable(makeTx([{ id: "u1" }]), ["/api/files/u1"]).catch((e) => e);
    expect(error).toBeInstanceOf(DeletedMediaReferenceError);
    expect(error.status).toBe(409);
    expect(error.uploadIds).toEqual(["u1"]);
  });
});

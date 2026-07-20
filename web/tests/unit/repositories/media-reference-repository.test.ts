import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => {
  // 交易客戶端沿用同一組 mock，讓 collectReferences 在交易內外行為一致。
  const client = {
    post: { findMany: vi.fn() },
    siteSetting: { findMany: vi.fn() },
    upload: { update: vi.fn() },
  };
  return {
    prisma: {
      ...client,
      $transaction: vi.fn(async (fn: (tx: typeof client) => unknown) => fn(client)),
    },
  };
});

import { mediaReferenceRepositoryPrisma } from "@/modules/media/infrastructure/prisma/media-reference.repository.prisma";

describe("mediaReferenceRepositoryPrisma", () => {
  beforeEach(() => vi.clearAllMocks());

  it("回傳文章 HTML 的精確媒體引用", async () => {
    (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "post-1", title: "首頁", coverImage: null, ogImage: null, allowRawHtml: false, content: '<img src="/api/files/up-1">' },
    ]);
    (prisma.siteSetting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await mediaReferenceRepositoryPrisma.listStructuredReferences("up-1");

    expect(result).toContainEqual(expect.objectContaining({ resourceId: "post-1", field: "content", certainty: "exact" }));
    expect(prisma.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.arrayContaining([{ content: { contains: "up-1" } }]) }),
    }));
  });

  it("將只含媒體 ID 的 Raw HTML 候選標示為需人工檢查", async () => {
    (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "post-2", title: "嵌入碼", coverImage: null, ogImage: null, allowRawHtml: true, content: '<custom-media data-id="up-1" />' },
    ]);
    (prisma.siteSetting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await expect(mediaReferenceRepositoryPrisma.listStructuredReferences("up-1")).resolves.toContainEqual(
      expect.objectContaining({ resourceId: "post-2", field: "content", certainty: "manual-review", label: expect.stringContaining("人工檢查") }),
    );
  });

  it("引用檢查不以 deletedAt 過濾，涵蓋垃圾桶文章", async () => {
    // 垃圾桶文章仍可還原，其引用必須納入，否則刪除媒體會讓還原後 URL 失效。
    (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.siteSetting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await mediaReferenceRepositoryPrisma.listStructuredReferences("up-1");

    const whereArg = (prisma.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0].where;
    expect(whereArg).not.toHaveProperty("deletedAt");
  });

  it("softDeleteUploadIfUnreferenced 於無引用時在交易內軟刪除", async () => {
    (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.siteSetting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.upload.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "up-1" });

    await expect(mediaReferenceRepositoryPrisma.softDeleteUploadIfUnreferenced("up-1")).resolves.toEqual({ ok: true });
    expect(prisma.upload.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "up-1" } }));
  });

  it("softDeleteUploadIfUnreferenced 於仍有引用時不刪除並回報 referenced", async () => {
    (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "post-1", title: "首頁", coverImage: "/api/files/up-1", ogImage: null, allowRawHtml: false, content: "" },
    ]);
    (prisma.siteSetting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await mediaReferenceRepositoryPrisma.softDeleteUploadIfUnreferenced("up-1");

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: "referenced" }));
    expect(prisma.upload.update).not.toHaveBeenCalled();
  });

  it("softDeleteUploadIfUnreferenced 於僅 manual-review 候選時放行刪除 (C3)", async () => {
    // 內文僅含裸 id（非完整 /api/files/up-1）且允許 Raw HTML → certainty manual-review；
    // 低確定性候選不得硬阻擋，交易內應放行軟刪除。
    (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "post-2", title: "嵌入碼", coverImage: null, ogImage: null, allowRawHtml: true, content: '<custom-media data-id="up-1" />' },
    ]);
    (prisma.siteSetting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.upload.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "up-1" });

    const result = await mediaReferenceRepositoryPrisma.softDeleteUploadIfUnreferenced("up-1");

    expect(result).toEqual({ ok: true });
    expect(prisma.upload.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "up-1" } }));
  });

  it("softDeleteUploadIfUnreferenced 於並行寫入衝突（P2034）回報 conflict", async () => {
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("write conflict", { code: "P2034", clientVersion: "5.22.0" }),
    );

    const result = await mediaReferenceRepositoryPrisma.softDeleteUploadIfUnreferenced("up-1");

    expect(result).toEqual({ ok: false, reason: "conflict" });
  });
});

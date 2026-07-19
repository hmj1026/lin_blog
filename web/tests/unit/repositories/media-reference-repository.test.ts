import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: {
    post: { findMany: vi.fn() },
    siteSetting: { findMany: vi.fn() },
  },
}));

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
});

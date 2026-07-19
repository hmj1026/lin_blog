import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  category: { findMany: vi.fn() },
  tag: { findMany: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { categoryRepositoryPrisma } from "@/modules/posts/infrastructure/prisma/category.repository.prisma";
import { tagRepositoryPrisma } from "@/modules/posts/infrastructure/prisma/tag.repository.prisma";

describe("taxonomy repositories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps active post relation counts into the category admin DTO", async () => {
    prismaMock.category.findMany.mockResolvedValue([{ id: "c1", name: "分類", slug: "cat", description: null, showInNav: false, navOrder: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date(), _count: { posts: 4 } }]);
    await expect(categoryRepositoryPrisma.listAll()).resolves.toEqual([
      expect.objectContaining({ id: "c1", postCount: 4 }),
    ]);
  });

  it("maps active post relation counts into the tag admin DTO", async () => {
    prismaMock.tag.findMany.mockResolvedValue([{ id: "t1", name: "標籤", slug: "tag", deletedAt: null, createdAt: new Date(), updatedAt: new Date(), _count: { posts: 2 } }]);
    await expect(tagRepositoryPrisma.listAll()).resolves.toEqual([
      expect.objectContaining({ id: "t1", postCount: 2 }),
    ]);
  });

  it("moves category relations in one batched connect/disconnect and soft-deletes the source", async () => {
    const tx = {
      category: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ deletedAt: null, posts: [{ id: "p1", deletedAt: null, categories: [] }, { id: "p2", deletedAt: null, categories: [] }] })
          .mockResolvedValueOnce({ deletedAt: null }),
        update: vi.fn().mockResolvedValue({ id: "c1" }),
      },
      post: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    await expect(categoryRepositoryPrisma.merge("c1", "c2")).resolves.toEqual({ id: "c1", movedPosts: 2 });
    // 不再逐篇更新文章（避免 N+1），改由目標分類批次 connect、來源分類批次 disconnect + 軟刪除。
    expect(tx.post.update).not.toHaveBeenCalled();
    expect(tx.category.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "c2" },
      data: { posts: { connect: [{ id: "p1" }, { id: "p2" }] } },
    }));
    expect(tx.category.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "c1" },
      data: expect.objectContaining({ showInNav: false, deletedAt: expect.any(Date), posts: { disconnect: [{ id: "p1" }, { id: "p2" }] } }),
    }));
  });

  it("movedPosts 排除垃圾桶文章與已連結目標的重複關聯", async () => {
    const tx = {
      category: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ deletedAt: null, posts: [
            { id: "p1", deletedAt: null, categories: [] },              // 有效新增
            { id: "p2", deletedAt: new Date(), categories: [] },        // 垃圾桶 → 不計
            { id: "p3", deletedAt: null, categories: [{ id: "c2" }] },  // 已連結目標 → 不計
          ] })
          .mockResolvedValueOnce({ deletedAt: null }),
        update: vi.fn().mockResolvedValue({ id: "c1" }),
      },
      post: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    // 三篇來源文章但只有 1 篇為有效新增關聯，movedPosts 應為 1（而非總數 3）。
    await expect(categoryRepositoryPrisma.merge("c1", "c2")).resolves.toEqual({ id: "c1", movedPosts: 1 });
  });

  it("does not mutate when the tag merge target is deleted", async () => {
    const tx = {
      tag: {
        findUnique: vi.fn()
          .mockResolvedValueOnce({ deletedAt: null, posts: [{ id: "p1" }] })
          .mockResolvedValueOnce({ deletedAt: new Date() }),
        update: vi.fn(),
      },
      post: { update: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((callback) => callback(tx));

    await expect(tagRepositoryPrisma.merge("t1", "t2")).rejects.toThrow("目標標籤不存在或已刪除");
    expect(tx.post.update).not.toHaveBeenCalled();
    expect(tx.tag.update).not.toHaveBeenCalled();
  });
});

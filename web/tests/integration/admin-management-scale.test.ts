import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostStatus, UploadVisibility, type PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";
import { postRepositoryPrisma } from "@/modules/posts/infrastructure/prisma/post.repository.prisma";
import { uploadRepositoryPrisma } from "@/modules/media/infrastructure/prisma/upload.repository.prisma";
import { subscriberListRepositoryPrisma } from "@/modules/newsletter/infrastructure/prisma/subscriber-list.repository.prisma";

const MAX_QUERY_MS = 2_000;

async function timed<T>(query: () => Promise<T>) {
  const startedAt = performance.now();
  const result = await query();
  return { result, elapsedMs: performance.now() - startedAt };
}

/** P1 管理列表在實際 PostgreSQL 千筆資料量下的有界分頁與操作狀態契約。 */
describe("admin management scale fixtures", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrismaClient();
    await truncateAll(prisma);
    await Promise.all([
      prisma.post.createMany({ data: Array.from({ length: 1_000 }, (_, index) => ({
        slug: `scale-post-${index.toString().padStart(4, "0")}`,
        title: `Scale Post ${index.toString().padStart(4, "0")}`,
        excerpt: "scale fixture",
        content: "<p>scale fixture</p>",
        status: PostStatus.DRAFT,
      })) }),
      prisma.upload.createMany({ data: Array.from({ length: 1_000 }, (_, index) => ({
        originalName: `scale-media-${index.toString().padStart(4, "0")}.jpg`,
        storageKey: `scale/media-${index.toString().padStart(4, "0")}.jpg`,
        mimeType: "image/jpeg",
        size: 1_024,
        visibility: UploadVisibility.PUBLIC,
      })) }),
      prisma.subscriber.createMany({ data: Array.from({ length: 65 }, (_, index) => ({
        name: `Scale Subscriber ${index.toString().padStart(3, "0")}`,
        email: `scale-subscriber-${index}@example.com`,
      })) }),
    ]);
  }, 30_000);

  afterAll(async () => prisma.$disconnect());

  it("1000 篇文章仍只回傳有界頁面且跨頁狀態不重疊", async () => {
    const params = { deleted: false, sort: "created-desc" as const, pageSize: 50 };
    const first = await timed(() => postRepositoryPrisma.listForAdmin({ ...params, page: 1 }));
    const second = await timed(() => postRepositoryPrisma.listForAdmin({ ...params, page: 2 }));

    expect(first.result.pagination).toEqual({ page: 1, pageSize: 50, total: 1_000, totalPages: 20 });
    expect(first.result.data).toHaveLength(50);
    expect(second.result.data).toHaveLength(50);
    const firstIds = new Set(first.result.data.map((item) => item.id));
    expect(second.result.data.every((item) => !firstIds.has(item.id))).toBe(true);
    expect(Math.max(first.elapsedMs, second.elapsedMs)).toBeLessThan(MAX_QUERY_MS);
  });

  it("1000 個媒體項目以資料庫分頁與總數查詢維持有界", async () => {
    const first = await timed(() => uploadRepositoryPrisma.listPage({ type: "image/", page: 1, pageSize: 40 }));
    const second = await timed(() => uploadRepositoryPrisma.listPage({ type: "image/", page: 2, pageSize: 40 }));

    expect(first.result).toEqual(expect.objectContaining({ total: 1_000, items: expect.any(Array) }));
    expect(first.result.items).toHaveLength(40);
    expect(second.result.items).toHaveLength(40);
    const firstIds = new Set(first.result.items.map((item) => item.id));
    expect(second.result.items.every((item) => !firstIds.has(item.id))).toBe(true);
    expect(Math.max(first.elapsedMs, second.elapsedMs)).toBeLessThan(MAX_QUERY_MS);
  });

  it("多頁訂閱者 fixture 保持 safe DTO、總數與穩定頁面", async () => {
    const result = await timed(() => subscriberListRepositoryPrisma.list({ search: "scale-subscriber", page: 2, pageSize: 20 }));

    expect(result.result.total).toBe(65);
    expect(result.result.items).toHaveLength(20);
    expect(Object.keys(result.result.items[0]).sort()).toEqual(["createdAt", "email", "id", "name"]);
    expect(result.elapsedMs).toBeLessThan(MAX_QUERY_MS);
  });
});

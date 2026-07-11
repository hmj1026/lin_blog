import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";
import { discoveryPostsRepositoryPrisma } from "@/modules/discovery/infrastructure/prisma/discovery-posts.repository.prisma";

/**
 * `DiscoveryPostsPort.searchPublished` 整合測試：驗證只比對已發佈且未
 * 刪除文章的標題／摘要，且不外洩草稿、排程、已刪除文章。
 */
describe("discoveryPostsRepositoryPrisma.searchPublished", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  async function seedPosts() {
    const now = new Date("2026-01-10T00:00:00.000Z");
    const future = new Date("2099-01-01T00:00:00.000Z");

    await prisma.post.create({
      data: {
        slug: "published-title-match",
        title: "Keyword in title",
        excerpt: "unrelated excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: now,
      },
    });

    await prisma.post.create({
      data: {
        slug: "published-excerpt-match",
        title: "unrelated title",
        excerpt: "Keyword in excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-11T00:00:00.000Z"),
      },
    });

    await prisma.post.create({
      data: {
        slug: "draft-post",
        title: "Keyword draft",
        excerpt: "excerpt",
        content: "content",
        status: "DRAFT",
        publishedAt: null,
      },
    });

    await prisma.post.create({
      data: {
        slug: "scheduled-post",
        title: "Keyword scheduled",
        excerpt: "excerpt",
        content: "content",
        status: "SCHEDULED",
        publishedAt: future,
      },
    });

    await prisma.post.create({
      data: {
        slug: "deleted-post",
        title: "Keyword deleted",
        excerpt: "excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: now,
        deletedAt: now,
      },
    });
  }

  it("matches only published, non-deleted posts by title or excerpt", async () => {
    await seedPosts();

    const result = await discoveryPostsRepositoryPrisma.searchPublished({
      query: "Keyword",
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(2);
    const slugs = result.items.map((item) => item.slug).sort();
    expect(slugs).toEqual(["published-excerpt-match", "published-title-match"]);
  });

  it("orders NULL publishedAt after dated posts (NULLS LAST)", async () => {
    // 公開可見性允許 publishedAt IS NULL；Postgres DESC 預設 NULLS FIRST，
    // 若未指定 NULLS LAST，null 會被排在最新文章之前（spec public-post-discovery）。
    await prisma.post.create({
      data: {
        slug: "keyword-null-published",
        title: "Keyword null",
        excerpt: "excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: null,
      },
    });
    await prisma.post.create({
      data: {
        slug: "keyword-dated",
        title: "Keyword dated",
        excerpt: "excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-10T00:00:00.000Z"),
      },
    });

    const result = await discoveryPostsRepositoryPrisma.searchPublished({
      query: "Keyword",
      page: 1,
      pageSize: 10,
    });

    expect(result.items.map((item) => item.slug)).toEqual(["keyword-dated", "keyword-null-published"]);
  });

  it("excludes PUBLISHED posts whose publishedAt is still in the future", async () => {
    await prisma.post.create({
      data: {
        slug: "future-published",
        title: "Keyword future",
        excerpt: "excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: new Date("2099-01-01T00:00:00.000Z"),
      },
    });
    await prisma.post.create({
      data: {
        slug: "already-published",
        title: "Keyword now",
        excerpt: "excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-10T00:00:00.000Z"),
      },
    });

    const result = await discoveryPostsRepositoryPrisma.searchPublished({
      query: "Keyword",
      page: 1,
      pageSize: 10,
    });

    const slugs = result.items.map((item) => item.slug);
    expect(slugs).toContain("already-published");
    expect(slugs).not.toContain("future-published");
    expect(result.total).toBe(1);
  });

  it("selects only public DTO fields, never post content", async () => {
    await seedPosts();

    const result = await discoveryPostsRepositoryPrisma.searchPublished({
      query: "Keyword",
      page: 1,
      pageSize: 10,
    });

    for (const item of result.items) {
      expect(item).not.toHaveProperty("content");
      expect(item).not.toHaveProperty("status");
      expect(item).not.toHaveProperty("deletedAt");
    }
  });

  it("matches case-insensitively", async () => {
    await seedPosts();

    const result = await discoveryPostsRepositoryPrisma.searchPublished({
      query: "keyword",
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(2);
  });

  it("paginates with stable order (publishedAt DESC, id tiebreak)", async () => {
    await prisma.post.create({
      data: {
        slug: "tie-a",
        title: "Tie keyword",
        excerpt: "excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-05T00:00:00.000Z"),
      },
    });
    await prisma.post.create({
      data: {
        slug: "tie-b",
        title: "Tie keyword",
        excerpt: "excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-05T00:00:00.000Z"),
      },
    });
    await prisma.post.create({
      data: {
        slug: "newest",
        title: "Tie keyword",
        excerpt: "excerpt",
        content: "content",
        status: "PUBLISHED",
        publishedAt: new Date("2026-01-06T00:00:00.000Z"),
      },
    });

    const page1 = await discoveryPostsRepositoryPrisma.searchPublished({
      query: "Tie keyword",
      page: 1,
      pageSize: 2,
    });
    const page2 = await discoveryPostsRepositoryPrisma.searchPublished({
      query: "Tie keyword",
      page: 2,
      pageSize: 2,
    });

    expect(page1.total).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(1);
    expect(page1.items[0].slug).toBe("newest");

    // Re-run to confirm stable order across repeated calls (no data change).
    const page1Again = await discoveryPostsRepositoryPrisma.searchPublished({
      query: "Tie keyword",
      page: 1,
      pageSize: 2,
    });
    expect(page1Again.items.map((i) => i.slug)).toEqual(page1.items.map((i) => i.slug));
  });
});

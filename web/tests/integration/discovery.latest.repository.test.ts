import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";
import { discoveryPostsRepositoryPrisma } from "@/modules/discovery/infrastructure/prisma/discovery-posts.repository.prisma";
import { discoveryAnalyticsRepositoryPrisma } from "@/modules/discovery/infrastructure/prisma/discovery-analytics.repository.prisma";
import { createDiscoveryUseCases } from "@/modules/discovery/application/use-cases";

/**
 * `DiscoveryPostsPort.listLatestPublished` 整合測試，以及熱門文章不足時
 * 由最新文章補位去重的 use case 契約（去重與補位邏輯本身已由
 * `discovery.use-cases.test.ts` 以 mock ports 單元測試涵蓋；這裡改用真實
 * Prisma adapter 驗證兩個 port 串接後行為正確）。
 */
describe("discoveryPostsRepositoryPrisma.listLatestPublished", () => {
  let prisma: PrismaClient;
  const asOf = new Date("2026-02-01T00:00:00.000Z");

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  async function createPost(overrides: {
    slug: string;
    status?: "PUBLISHED" | "DRAFT" | "SCHEDULED";
    deletedAt?: Date | null;
    publishedAt?: Date | null;
  }) {
    return prisma.post.create({
      data: {
        slug: overrides.slug,
        title: overrides.slug,
        excerpt: "excerpt",
        content: "content",
        status: overrides.status ?? "PUBLISHED",
        // 顯式 null 需保留（測試 NULLS LAST），只有未提供時才用預設值
        publishedAt:
          overrides.publishedAt === undefined ? new Date("2026-01-01T00:00:00.000Z") : overrides.publishedAt,
        deletedAt: overrides.deletedAt ?? null,
      },
    });
  }

  it("returns published posts ordered by publishedAt DESC, capped at take", async () => {
    await createPost({ slug: "oldest", publishedAt: new Date("2026-01-01T00:00:00.000Z") });
    await createPost({ slug: "middle", publishedAt: new Date("2026-01-02T00:00:00.000Z") });
    await createPost({ slug: "newest", publishedAt: new Date("2026-01-03T00:00:00.000Z") });

    const result = await discoveryPostsRepositoryPrisma.listLatestPublished({ take: 2, asOf });

    expect(result.map((r) => r.slug)).toEqual(["newest", "middle"]);
  });

  it("excludes draft, scheduled and deleted posts", async () => {
    await createPost({ slug: "draft-post", status: "DRAFT" });
    await createPost({ slug: "scheduled-post", status: "SCHEDULED", publishedAt: new Date("2099-01-01T00:00:00.000Z") });
    await createPost({ slug: "deleted-post", deletedAt: new Date("2026-01-01T00:00:00.000Z") });
    await createPost({ slug: "published-post" });

    const result = await discoveryPostsRepositoryPrisma.listLatestPublished({ take: 10, asOf });

    expect(result.map((r) => r.slug)).toEqual(["published-post"]);
  });

  it("excludes PUBLISHED posts whose publishedAt is still in the future", async () => {
    await createPost({ slug: "future-published", status: "PUBLISHED", publishedAt: new Date("2099-01-01T00:00:00.000Z") });
    await createPost({ slug: "already-published", status: "PUBLISHED", publishedAt: new Date("2026-01-01T00:00:00.000Z") });

    const result = await discoveryPostsRepositoryPrisma.listLatestPublished({ take: 10, asOf });

    expect(result.map((r) => r.slug)).toEqual(["already-published"]);
  });

  it("evaluates publication visibility at the supplied snapshot", async () => {
    const snapshot = new Date("2026-01-01T00:00:00.000Z");
    await createPost({
      slug: "published-after-snapshot",
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    await createPost({
      slug: "published-at-snapshot",
      status: "PUBLISHED",
      publishedAt: snapshot,
    });

    const result = await discoveryPostsRepositoryPrisma.listLatestPublished({ take: 10, asOf: snapshot });

    expect(result.map((r) => r.slug)).toEqual(["published-at-snapshot"]);
  });

  it("orders NULL publishedAt after dated posts (NULLS LAST)", async () => {
    // 公開可見性允許 publishedAt IS NULL；Postgres DESC 預設 NULLS FIRST，
    // 若未指定 NULLS LAST，null 會被排在最新文章之前（spec public-post-discovery）。
    await createPost({ slug: "null-published", publishedAt: null });
    await createPost({ slug: "dated-old", publishedAt: new Date("2026-01-01T00:00:00.000Z") });
    await createPost({ slug: "dated-new", publishedAt: new Date("2026-01-05T00:00:00.000Z") });

    const result = await discoveryPostsRepositoryPrisma.listLatestPublished({ take: 10, asOf });

    expect(result.map((r) => r.slug)).toEqual(["dated-new", "dated-old", "null-published"]);
  });

  it("returns an empty list when there are zero published posts", async () => {
    const result = await discoveryPostsRepositoryPrisma.listLatestPublished({ take: 5, asOf });
    expect(result).toEqual([]);
  });

  describe("discovery use case fallback wired to real Prisma adapters", () => {
    it("fills the popular list with latest posts, deduped, when there are no view events", async () => {
      for (let i = 0; i < 5; i++) {
        await createPost({ slug: `latest-${i}`, publishedAt: new Date(`2026-01-0${i + 1}T00:00:00.000Z`) });
      }

      const useCases = createDiscoveryUseCases({
        posts: discoveryPostsRepositoryPrisma,
        analytics: discoveryAnalyticsRepositoryPrisma,
      });

      const result = await useCases.listPopularPosts({ now: new Date("2026-02-01T00:00:00.000Z") });

      expect(result).toHaveLength(5);
      const slugs = result.map((r) => r.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });
});

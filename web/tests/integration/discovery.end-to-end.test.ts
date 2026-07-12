import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";
import { createDiscoveryUseCases } from "@/modules/discovery/application/use-cases";
import { discoveryPostsRepositoryPrisma } from "@/modules/discovery/infrastructure/prisma/discovery-posts.repository.prisma";
import { discoveryAnalyticsRepositoryPrisma } from "@/modules/discovery/infrastructure/prisma/discovery-analytics.repository.prisma";

/**
 * Task 9.1 — public discovery 端到端整合測試。
 *
 * 與 `discovery.search.repository.test.ts` / `discovery.popular.repository.test.ts` /
 * `discovery.latest.repository.test.ts` 不同：本檔案不直接呼叫單一 Prisma adapter，
 * 而是以 `createDiscoveryUseCases` 組裝「與 app 相同的真實 Prisma 讀取棧」
 * （`discoveryPostsRepositoryPrisma` + `discoveryAnalyticsRepositoryPrisma`），
 * 驗證 use case → adapter → 資料庫 → 公開 DTO 的完整資料流，而非個別 adapter 契約。
 *
 * fixture slug 一律以 `e2e-discovery-` 開頭，作為本檔案專用的識別標記，
 * 避免與其他整合測試檔（同一測試庫，序列執行）的資料混淆。
 */
describe("discovery end-to-end (real Prisma stack)", () => {
  let prisma: PrismaClient;
  const useCases = createDiscoveryUseCases({
    posts: discoveryPostsRepositoryPrisma,
    analytics: discoveryAnalyticsRepositoryPrisma,
  });

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
    title?: string;
    excerpt?: string;
    status?: "PUBLISHED" | "DRAFT" | "SCHEDULED";
    deletedAt?: Date | null;
    publishedAt?: Date | null;
  }) {
    return prisma.post.create({
      data: {
        slug: overrides.slug,
        title: overrides.title ?? overrides.slug,
        excerpt: overrides.excerpt ?? "excerpt",
        content: "content",
        status: overrides.status ?? "PUBLISHED",
        publishedAt: overrides.publishedAt ?? new Date("2026-01-01T00:00:00.000Z"),
        deletedAt: overrides.deletedAt ?? null,
      },
    });
  }

  async function createViewEvent(postId: string, slug: string, viewedAt: Date) {
    return prisma.postViewEvent.create({
      data: {
        postId,
        slug,
        viewedAt,
        ip: "127.0.0.1",
        userAgent: "test-agent",
        deviceType: "DESKTOP",
        fingerprint: `fp-${slug}-${viewedAt.getTime()}-${Math.random()}`,
      },
    });
  }

  describe("search", () => {
    it("finds only published, non-deleted matches with stable pagination end-to-end", async () => {
      const marker = "E2eDiscoverySearchMarker";

      const older = await createPost({
        slug: "e2e-discovery-search-older",
        title: `${marker} older`,
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      });
      const middle = await createPost({
        slug: "e2e-discovery-search-middle",
        title: `${marker} middle`,
        publishedAt: new Date("2026-01-02T00:00:00.000Z"),
      });
      const newest = await createPost({
        slug: "e2e-discovery-search-newest",
        excerpt: `${marker} in excerpt`,
        publishedAt: new Date("2026-01-03T00:00:00.000Z"),
      });

      await createPost({
        slug: "e2e-discovery-search-draft",
        title: `${marker} draft`,
        status: "DRAFT",
        publishedAt: null,
      });
      await createPost({
        slug: "e2e-discovery-search-scheduled",
        title: `${marker} scheduled`,
        status: "SCHEDULED",
        publishedAt: new Date("2099-01-01T00:00:00.000Z"),
      });
      await createPost({
        slug: "e2e-discovery-search-deleted",
        title: `${marker} deleted`,
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const page1 = await useCases.searchPublicPosts({ query: `  ${marker}  `, page: 1, pageSize: 2 });
      const page2 = await useCases.searchPublicPosts({ query: marker, page: 2, pageSize: 2 });

      expect(page1.kind).toBe("results");
      if (page1.kind !== "results") throw new Error("expected results");
      expect(page1.query).toBe(marker);
      expect(page1.total).toBe(3);
      expect(page1.items).toHaveLength(2);
      expect(page1.items[0].slug).toBe(newest.slug);
      expect(page1.items[1].slug).toBe(middle.slug);

      if (page2.kind !== "results") throw new Error("expected results");
      expect(page2.items).toHaveLength(1);
      expect(page2.items[0].slug).toBe(older.slug);

      const allSlugs = [...page1.items, ...page2.items].map((i) => i.slug);
      expect(allSlugs).not.toContain("e2e-discovery-search-draft");
      expect(allSlugs).not.toContain("e2e-discovery-search-scheduled");
      expect(allSlugs).not.toContain("e2e-discovery-search-deleted");

      // Re-run page 1 to confirm stable order across repeated calls.
      const page1Again = await useCases.searchPublicPosts({ query: marker, page: 1, pageSize: 2 });
      if (page1Again.kind !== "results") throw new Error("expected results");
      expect(page1Again.items.map((i) => i.slug)).toEqual(page1.items.map((i) => i.slug));
    });

    it("leaves an empty query in place instead of listing site-wide posts", async () => {
      await createPost({ slug: "e2e-discovery-search-any" });

      const result = await useCases.searchPublicPosts({ query: "   " });

      expect(result).toEqual({ kind: "empty-query", query: "" });
    });
  });

  describe("popular", () => {
    it("ranks by 30-day view count with publishedAt tie-break, excluding non-public and out-of-window views", async () => {
      const now = new Date("2026-02-01T00:00:00.000Z");
      const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Tie in view count -> newer publishedAt (b) ranks above older (a).
      const a = await createPost({ slug: "e2e-discovery-popular-a", publishedAt: new Date("2026-01-10T00:00:00.000Z") });
      const b = await createPost({ slug: "e2e-discovery-popular-b", publishedAt: new Date("2026-01-15T00:00:00.000Z") });
      const c = await createPost({ slug: "e2e-discovery-popular-c", publishedAt: new Date("2026-01-20T00:00:00.000Z") });
      const d = await createPost({ slug: "e2e-discovery-popular-d", publishedAt: new Date("2026-01-05T00:00:00.000Z") });
      const e = await createPost({ slug: "e2e-discovery-popular-e", publishedAt: new Date("2026-01-01T00:00:00.000Z") });

      for (let i = 0; i < 5; i++) await createViewEvent(a.id, a.slug, new Date("2026-01-25T00:00:00.000Z"));
      for (let i = 0; i < 5; i++) await createViewEvent(b.id, b.slug, new Date("2026-01-25T00:00:00.000Z"));
      for (let i = 0; i < 3; i++) await createViewEvent(c.id, c.slug, new Date("2026-01-25T00:00:00.000Z"));
      for (let i = 0; i < 2; i++) await createViewEvent(d.id, d.slug, new Date("2026-01-25T00:00:00.000Z"));
      await createViewEvent(e.id, e.slug, new Date("2026-01-25T00:00:00.000Z"));

      const draftWithViews = await createPost({ slug: "e2e-discovery-popular-draft", status: "DRAFT" });
      const deletedWithViews = await createPost({
        slug: "e2e-discovery-popular-deleted",
        deletedAt: new Date("2026-01-05T00:00:00.000Z"),
      });
      for (let i = 0; i < 100; i++) {
        await createViewEvent(draftWithViews.id, draftWithViews.slug, new Date("2026-01-25T00:00:00.000Z"));
        await createViewEvent(deletedWithViews.id, deletedWithViews.slug, new Date("2026-01-25T00:00:00.000Z"));
      }

      const outOfWindow = await createPost({ slug: "e2e-discovery-popular-out-of-window" });
      await createViewEvent(outOfWindow.id, outOfWindow.slug, new Date(since.getTime() - 1));

      const result = await useCases.listPopularPosts({ now });

      expect(result.map((r) => r.slug)).toEqual([b.slug, a.slug, c.slug, d.slug, e.slug]);
      const slugs = result.map((r) => r.slug);
      expect(slugs).not.toContain(draftWithViews.slug);
      expect(slugs).not.toContain(deletedWithViews.slug);
      expect(slugs).not.toContain(outOfWindow.slug);
    });

    it("fills remaining slots from latest posts, deduped, when popular has fewer than 5", async () => {
      const now = new Date("2026-02-01T00:00:00.000Z");

      // Most recently published post also happens to be the only popular one;
      // it must not be duplicated when the fallback pulls in latest posts.
      const popular = await createPost({
        slug: "e2e-discovery-fallback-popular",
        publishedAt: new Date("2026-01-30T00:00:00.000Z"),
      });
      await createViewEvent(popular.id, popular.slug, new Date("2026-01-31T00:00:00.000Z"));

      const fallbackA = await createPost({
        slug: "e2e-discovery-fallback-a",
        publishedAt: new Date("2026-01-25T00:00:00.000Z"),
      });
      const fallbackB = await createPost({
        slug: "e2e-discovery-fallback-b",
        publishedAt: new Date("2026-01-20T00:00:00.000Z"),
      });
      const fallbackC = await createPost({
        slug: "e2e-discovery-fallback-c",
        publishedAt: new Date("2026-01-15T00:00:00.000Z"),
      });
      const fallbackD = await createPost({
        slug: "e2e-discovery-fallback-d",
        publishedAt: new Date("2026-01-10T00:00:00.000Z"),
      });

      const result = await useCases.listPopularPosts({ now });

      expect(result.map((r) => r.slug)).toEqual([
        popular.slug,
        fallbackA.slug,
        fallbackB.slug,
        fallbackC.slug,
        fallbackD.slug,
      ]);
      const slugs = result.map((r) => r.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe("latest", () => {
    it("orders published posts by publishedAt DESC with a stable cap, excluding draft/scheduled/deleted", async () => {
      const posts = [];
      for (let i = 1; i <= 6; i++) {
        posts.push(
          await createPost({
            slug: `e2e-discovery-latest-${i}`,
            publishedAt: new Date(`2026-01-0${i}T00:00:00.000Z`),
          })
        );
      }

      await createPost({ slug: "e2e-discovery-latest-draft", status: "DRAFT", publishedAt: null });
      await createPost({
        slug: "e2e-discovery-latest-scheduled",
        status: "SCHEDULED",
        publishedAt: new Date("2099-01-01T00:00:00.000Z"),
      });
      await createPost({
        slug: "e2e-discovery-latest-deleted",
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      const result = await useCases.listLatestPosts();

      expect(result).toHaveLength(5);
      expect(result.map((r) => r.slug)).toEqual([
        "e2e-discovery-latest-6",
        "e2e-discovery-latest-5",
        "e2e-discovery-latest-4",
        "e2e-discovery-latest-3",
        "e2e-discovery-latest-2",
      ]);
    });
  });

  describe("public DTO shape", () => {
    it("exposes only the minimal public fields end-to-end across search, popular and latest", async () => {
      const now = new Date("2026-02-01T00:00:00.000Z");
      const post = await createPost({
        slug: "e2e-discovery-dto-shape",
        title: "E2eDiscoveryDtoShapeMarker",
      });
      await createViewEvent(post.id, post.slug, new Date("2026-01-25T00:00:00.000Z"));

      const allowedKeys = ["slug", "title", "excerpt", "coverImage", "publishedAt", "category"].sort();

      const searchResult = await useCases.searchPublicPosts({ query: "E2eDiscoveryDtoShapeMarker" });
      if (searchResult.kind !== "results") throw new Error("expected results");
      const popularResult = await useCases.listPopularPosts({ now });
      const latestResult = await useCases.listLatestPosts();

      for (const item of [...searchResult.items, ...popularResult, ...latestResult]) {
        expect(Object.keys(item).sort()).toEqual(allowedKeys);
        expect(item).not.toHaveProperty("id");
        expect(item).not.toHaveProperty("content");
        expect(item).not.toHaveProperty("status");
        expect(item).not.toHaveProperty("deletedAt");
      }
    });
  });
});

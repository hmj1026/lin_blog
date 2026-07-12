import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";
import { discoveryAnalyticsRepositoryPrisma } from "@/modules/discovery/infrastructure/prisma/discovery-analytics.repository.prisma";

const NOW = new Date("2026-02-01T00:00:00.000Z");
const SINCE = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);

/**
 * `DiscoveryAnalyticsPort.listPopularPublishedSince` 整合測試：驗證只計入
 * 視窗內、未刪除的有效瀏覽事件，且只有仍為公開文章的事件能佔用排行名額。
 */
describe("discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince", () => {
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
        // 顯式 null 表示「無發佈日期」，不可被 ?? 蓋成 NOW
        publishedAt: overrides.publishedAt === undefined ? NOW : overrides.publishedAt,
        deletedAt: overrides.deletedAt ?? null,
      },
    });
  }

  async function createViewEvent(postId: string, slug: string, viewedAt: Date, deletedAt: Date | null = null) {
    return prisma.postViewEvent.create({
      data: {
        postId,
        slug,
        viewedAt,
        ip: "127.0.0.1",
        userAgent: "test-agent",
        deviceType: "DESKTOP",
        fingerprint: `fp-${slug}-${viewedAt.getTime()}-${Math.random()}`,
        deletedAt,
      },
    });
  }

  it("ranks published posts by view count within the last 30 days", async () => {
    const popular = await createPost({ slug: "popular", publishedAt: new Date("2026-01-15T00:00:00.000Z") });
    const lessPopular = await createPost({ slug: "less-popular", publishedAt: new Date("2026-01-16T00:00:00.000Z") });

    for (let i = 0; i < 3; i++) {
      await createViewEvent(popular.id, popular.slug, new Date("2026-01-20T00:00:00.000Z"));
    }
    await createViewEvent(lessPopular.id, lessPopular.slug, new Date("2026-01-20T00:00:00.000Z"));

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 5 });

    expect(result.map((r) => r.slug)).toEqual(["popular", "less-popular"]);
  });

  it("includes events exactly at the window boundary and excludes events one millisecond before it", async () => {
    // The window is `viewedAt >= since` (inclusive), consistent with the existing
    // analytics repository convention (`analyticsRepositoryPrisma.listEventsSince`).
    const atBoundary = await createPost({ slug: "at-boundary" });
    const beforeBoundary = await createPost({ slug: "before-boundary" });

    await createViewEvent(atBoundary.id, atBoundary.slug, SINCE);
    await createViewEvent(beforeBoundary.id, beforeBoundary.slug, new Date(SINCE.getTime() - 1));

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 5 });

    const slugs = result.map((r) => r.slug);
    expect(slugs).toContain("at-boundary");
    expect(slugs).not.toContain("before-boundary");
  });

  it("excludes view events with viewedAt after the closed window upper bound (future events)", async () => {
    // 時鐘偏移或匯入的未來事件不得主導排行：視窗為封閉區間 [since, until]。
    const futureViews = await createPost({ slug: "future-views", publishedAt: new Date("2026-01-10T00:00:00.000Z") });
    const normalViews = await createPost({ slug: "normal-views", publishedAt: new Date("2026-01-11T00:00:00.000Z") });

    for (let i = 0; i < 10; i++) {
      await createViewEvent(futureViews.id, futureViews.slug, new Date(NOW.getTime() + 60 * 60 * 1000));
    }
    await createViewEvent(futureViews.id, futureViews.slug, NOW);
    for (let i = 0; i < 2; i++) {
      await createViewEvent(normalViews.id, normalViews.slug, new Date("2026-01-20T00:00:00.000Z"));
    }

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 5 });

    // future-views 只有 1 筆有效事件（正好在 until 邊界），normal-views 有 2 筆。
    expect(result.map((r) => r.slug)).toEqual(["normal-views", "future-views"]);
  });

  it("excludes soft-deleted view events", async () => {
    const post = await createPost({ slug: "with-deleted-event" });
    await createViewEvent(post.id, post.slug, new Date("2026-01-20T00:00:00.000Z"), new Date("2026-01-21T00:00:00.000Z"));

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 5 });

    expect(result).toHaveLength(0);
  });

  it("excludes events pointing at draft or deleted posts, and does not let them consume ranking slots", async () => {
    const draftPost = await createPost({ slug: "draft-post", status: "DRAFT" });
    const deletedPost = await createPost({ slug: "deleted-post", deletedAt: NOW });
    const publishedPost = await createPost({ slug: "published-post" });

    // Draft/deleted posts get far more views than the published one.
    for (let i = 0; i < 10; i++) {
      await createViewEvent(draftPost.id, draftPost.slug, new Date("2026-01-20T00:00:00.000Z"));
      await createViewEvent(deletedPost.id, deletedPost.slug, new Date("2026-01-20T00:00:00.000Z"));
    }
    await createViewEvent(publishedPost.id, publishedPost.slug, new Date("2026-01-20T00:00:00.000Z"));

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 5 });

    expect(result.map((r) => r.slug)).toEqual(["published-post"]);
  });

  it("excludes PUBLISHED posts whose publishedAt is still in the future, even with views", async () => {
    const futurePost = await createPost({ slug: "future-published", publishedAt: new Date("2099-01-01T00:00:00.000Z") });
    const livePost = await createPost({ slug: "live-published", publishedAt: new Date("2026-01-15T00:00:00.000Z") });

    // Future-dated post has more views but must not appear or consume a slot.
    for (let i = 0; i < 5; i++) {
      await createViewEvent(futurePost.id, futurePost.slug, new Date("2026-01-20T00:00:00.000Z"));
    }
    await createViewEvent(livePost.id, livePost.slug, new Date("2026-01-20T00:00:00.000Z"));

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 5 });

    expect(result.map((r) => r.slug)).toEqual(["live-published"]);
  });

  it("orders by viewCount DESC, then publishedAt DESC, then id as a tiebreak, and caps at take", async () => {
    const older = await createPost({ slug: "older", publishedAt: new Date("2026-01-10T00:00:00.000Z") });
    const newer = await createPost({ slug: "newer", publishedAt: new Date("2026-01-20T00:00:00.000Z") });

    // Equal view counts -> tiebreak by publishedAt desc.
    await createViewEvent(older.id, older.slug, new Date("2026-01-25T00:00:00.000Z"));
    await createViewEvent(newer.id, newer.slug, new Date("2026-01-25T00:00:00.000Z"));

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 1 });

    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("newer");
  });

  it("ranks null-publishedAt posts after dated posts on equal view counts (NULLS LAST tiebreak)", async () => {
    // publishedAt null 視為「無日期＝最舊」：同瀏覽數時排在有日期文章之後。
    const nullDated = await createPost({ slug: "null-published", publishedAt: null });
    const dated = await createPost({ slug: "dated-published", publishedAt: new Date("2026-01-10T00:00:00.000Z") });

    await createViewEvent(nullDated.id, nullDated.slug, new Date("2026-01-25T00:00:00.000Z"));
    await createViewEvent(dated.id, dated.slug, new Date("2026-01-25T00:00:00.000Z"));

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 5 });

    expect(result.map((r) => r.slug)).toEqual(["dated-published", "null-published"]);
  });

  it("selects only public DTO fields, never exposing raw view event data", async () => {
    const post = await createPost({ slug: "public-fields" });
    await createViewEvent(post.id, post.slug, new Date("2026-01-20T00:00:00.000Z"));

    const result = await discoveryAnalyticsRepositoryPrisma.listPopularPublishedSince({ since: SINCE, until: NOW, take: 5 });

    expect(result[0]).not.toHaveProperty("content");
    expect(result[0]).not.toHaveProperty("status");
    expect(result[0]).not.toHaveProperty("fingerprint");
    expect(result[0]).not.toHaveProperty("ip");
  });
});

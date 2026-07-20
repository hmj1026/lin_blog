import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => {
  const prisma: any = {
    post: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
    postVersion: {
      create: vi.fn(),
    },
    category: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    // 以 mocked prisma 自身作為 transaction client（tx），讓 updateWithVersion 內的
    // tx.post / tx.postVersion 呼叫落在同一組 mock 上，方便斷言。
    $transaction: vi.fn(async (cb: (tx: any) => Promise<unknown>) => cb(prisma)),
    $executeRaw: vi.fn(),
  };
  return { prisma };
});

// Import after mock
import { postRepositoryPrisma } from "@/modules/posts/infrastructure/prisma/post.repository.prisma";
import { categoryRepositoryPrisma } from "@/modules/posts/infrastructure/prisma/category.repository.prisma";
import { tagRepositoryPrisma } from "@/modules/posts/infrastructure/prisma/tag.repository.prisma";

describe("postRepositoryPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listPublished", () => {
    it("calls prisma with correct filters", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.listPublished({});
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "PUBLISHED",
            deletedAt: null,
          }),
        })
      );
    });

    it("selects showRawHtmlToc in the post list item projection", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.listPublished({});
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            showRawHtmlToc: true,
          }),
        })
      );
    });

    it("filters by categorySlug when provided", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.listPublished({ categorySlug: "strategy" });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categories: expect.objectContaining({
              some: { slug: "strategy" },
            }),
          }),
        })
      );
    });

    it("filters by featured when provided", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.listPublished({ featured: true });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            featured: true,
          }),
        })
      );
    });

    it("bounds take to 100 when no take is provided", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.listPublished({});
      const call = (prisma.post.findMany as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];
      expect(call.take).toBeLessThanOrEqual(100);
    });

    it("clamps take to 100 even when caller requests a larger value", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.listPublished({ take: 100000 });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });

  describe("countPublished", () => {
    it("returns count of published posts", async () => {
      (prisma.post.count as ReturnType<typeof vi.fn>).mockResolvedValue(42);
      const result = await postRepositoryPrisma.countPublished();
      expect(result).toBe(42);
      expect(prisma.post.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: "PUBLISHED", deletedAt: null }),
        })
      );
    });
  });

  describe("countActive", () => {
    it("returns count of non-deleted posts", async () => {
      (prisma.post.count as ReturnType<typeof vi.fn>).mockResolvedValue(100);
      const result = await postRepositoryPrisma.countActive();
      expect(result).toBe(100);
      expect(prisma.post.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        })
      );
    });
  });

  describe("getBySlug", () => {
    it("returns post when found", async () => {
      const mockPost = {
        id: "p1",
        slug: "test-post",
        title: "Test",
        status: "PUBLISHED",
        categories: [],
        tags: [],
        author: null,
      };
      (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockPost);
      const result = await postRepositoryPrisma.getBySlug("test-post");
      expect(result?.slug).toBe("test-post");
    });

    it("returns null when not found", async () => {
      (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await postRepositoryPrisma.getBySlug("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("sets deletedAt timestamp", async () => {
      (prisma.post.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      await postRepositoryPrisma.softDelete("p1");
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: expect.objectContaining({
            deletedAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe("batchAction", () => {
    it("publishes multiple posts", async () => {
      (prisma.post.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });
      await postRepositoryPrisma.batchAction({
        action: "publish",
        postIds: ["p1", "p2", "p3"],
      });
      expect(prisma.post.updateMany).toHaveBeenCalledTimes(3);
      expect(prisma.post.updateMany).toHaveBeenNthCalledWith(1, {
        where: { id: "p1", deletedAt: null, status: "DRAFT" },
        data: { status: "PUBLISHED" },
      });
    });

    it("deletes multiple posts (soft delete)", async () => {
      (prisma.post.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });
      await postRepositoryPrisma.batchAction({
        action: "delete",
        postIds: ["p1", "p2"],
      });
      expect(prisma.post.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });

    it("returns per-post success and failure details", async () => {
      (prisma.post.updateMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });
      const result = await postRepositoryPrisma.batchAction({ action: "draft", postIds: ["p1", "missing"] });
      expect(result).toEqual({
        count: 1,
        results: [
          { id: "p1", ok: true },
          { id: "missing", ok: false, error: "not-applicable" },
        ],
      });
    });
  });

  describe("create", () => {
    it("creates post with relations", async () => {
      (prisma.post.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      await postRepositoryPrisma.create({
        slug: "s",
        title: "t",
        status: "DRAFT",
        content: "c",
        excerpt: "e",
        categoryIds: ["c1"],
        tagIds: ["t1"],
        allowRawHtml: true,
        showRawHtmlToc: true,
      });
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "s",
            categories: { connect: [{ id: "c1" }] },
            tags: { connect: [{ id: "t1" }] },
            allowRawHtml: true,
            showRawHtmlToc: true,
          }),
        })
      );
    });

    it("creates post with showRawHtmlToc defaulting to false when omitted", async () => {
      (prisma.post.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      await postRepositoryPrisma.create({
        slug: "s2",
        title: "t2",
        status: "DRAFT",
        content: "c",
        excerpt: "e",
        categoryIds: [],
        tagIds: [],
      });
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showRawHtmlToc: false,
          }),
        })
      );
    });

    it("於交易內先取得媒體引用共享 advisory lock 再建立文章", async () => {
      // 與媒體刪除的排他鎖互斥：避免刪除方確認無引用後、提交前，新文章寫入該媒體引用。
      (prisma.post.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      await postRepositoryPrisma.create({ slug: "s", title: "t", status: "DRAFT", content: "c", excerpt: "e" });

      const raw = prisma.$executeRaw as ReturnType<typeof vi.fn>;
      const sql = raw.mock.calls.map((call) => (call[0] as readonly string[]).join("?")).join("\n");
      expect(sql).toContain("pg_advisory_xact_lock_shared(");
      expect(raw.mock.invocationCallOrder[0]).toBeLessThan(
        (prisma.post.create as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
      );
    });
  });

  describe("update", () => {
    it("updates post fields and relations", async () => {
      (prisma.post.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      await postRepositoryPrisma.update("p1", {
        slug: "new-slug",
        title: "new",
        excerpt: "new excerpt",
        content: "new content",
        status: "DRAFT",
        categoryIds: ["c2"],
        tagIds: [],
        allowRawHtml: false,
        showRawHtmlToc: false,
      });
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: expect.objectContaining({
            title: "new",
            categories: { set: [{ id: "c2" }] },
            tags: { set: [] },
            allowRawHtml: false,
            showRawHtmlToc: false,
          }),
        })
      );
    });

    it("於交易內先取得媒體引用共享 advisory lock 再更新文章", async () => {
      (prisma.post.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      await postRepositoryPrisma.update("p1", { slug: "s", title: "new", excerpt: "e", content: "c", status: "DRAFT" });

      const raw = prisma.$executeRaw as ReturnType<typeof vi.fn>;
      const sql = raw.mock.calls.map((call) => (call[0] as readonly string[]).join("?")).join("\n");
      expect(sql).toContain("pg_advisory_xact_lock_shared(");
      expect(raw.mock.invocationCallOrder[0]).toBeLessThan(
        (prisma.post.update as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
      );
    });
  });

  describe("updateWithVersion", () => {
    const version = { title: "old", excerpt: "e", content: "old content", allowRawHtml: false, showRawHtmlToc: false, editorId: "u1" };
    const update = { slug: "s", title: "new", excerpt: "e2", content: "new content", status: "DRAFT" as const, allowRawHtml: false, showRawHtmlToc: false, categoryIds: null, tagIds: null };
    const expectedUpdatedAt = new Date("2026-01-01T00:00:00.000Z");

    it("snapshots the version and updates the post atomically when the optimistic lock matches", async () => {
      (prisma.post.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      (prisma.postVersion.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "v1" });
      (prisma.post.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ updatedAt: new Date("2026-02-02T00:00:00.000Z") });

      const result = await postRepositoryPrisma.updateWithVersion({ id: "p1", expectedUpdatedAt, version, update });

      expect(result).toEqual({ ok: true, id: "p1", updatedAt: new Date("2026-02-02T00:00:00.000Z") });
      // 版本快照與更新都發生在同一 $transaction 內。
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.postVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ postId: "p1", content: "old content", editorId: "u1" }) })
      );
      // 樂觀鎖：updateMany 以 updatedAt === expectedUpdatedAt 為條件。
      expect(prisma.post.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: "p1", updatedAt: expectedUpdatedAt }) })
      );
    });

    it("於交易內先取得媒體引用共享 advisory lock 再寫入版本與更新", async () => {
      (prisma.post.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      (prisma.postVersion.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "v1" });
      (prisma.post.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      (prisma.post.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ updatedAt: new Date() });

      await postRepositoryPrisma.updateWithVersion({ id: "p1", expectedUpdatedAt, version, update });

      const raw = prisma.$executeRaw as ReturnType<typeof vi.fn>;
      const sql = raw.mock.calls.map((call) => (call[0] as readonly string[]).join("?")).join("\n");
      expect(sql).toContain("pg_advisory_xact_lock_shared(");
      expect(raw.mock.invocationCallOrder[0]).toBeLessThan(
        (prisma.post.updateMany as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
      );
    });

    it("returns conflict (and does not commit the version) when the optimistic lock does not match", async () => {
      (prisma.post.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      (prisma.postVersion.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "v1" });
      // count === 0 表示他人已更新（updatedAt 已變）。
      (prisma.post.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

      const result = await postRepositoryPrisma.updateWithVersion({ id: "p1", expectedUpdatedAt, version, update });

      expect(result).toEqual({ ok: false, reason: "conflict" });
    });

    it("returns not-found when the post does not exist", async () => {
      (prisma.post.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await postRepositoryPrisma.updateWithVersion({ id: "missing", expectedUpdatedAt, version, update });

      expect(result).toEqual({ ok: false, reason: "not-found" });
      expect(prisma.postVersion.create).not.toHaveBeenCalled();
    });
  });

  describe("search", () => {
    it("searches title and excerpt", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.search({ query: "keyword" });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "PUBLISHED",
            deletedAt: null,
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  { title: { contains: "keyword", mode: "insensitive" } },
                  { excerpt: { contains: "keyword", mode: "insensitive" } },
                ]),
              }),
            ]),
          }),
        })
      );
    });
  });

  describe("listForAdmin", () => {
    it("applies bounded URL filters, sorting and pagination", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.post.count as ReturnType<typeof vi.fn>).mockResolvedValue(55);
      const result = await postRepositoryPrisma.listForAdmin({
        query: "launch",
        status: "DRAFT",
        categoryId: "cat-1",
        tagId: "tag-1",
        featured: true,
        deleted: false,
        sort: "title-asc",
        page: 2,
        pageSize: 25,
      });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            status: "DRAFT",
            featured: true,
            categories: { some: { id: "cat-1" } },
            tags: { some: { id: "tag-1" } },
            OR: expect.arrayContaining([
              { title: { contains: "launch", mode: "insensitive" } },
              { slug: { contains: "launch", mode: "insensitive" } },
            ]),
          }),
          orderBy: [{ title: "asc" }, { id: "desc" }],
          skip: 25,
          take: 25,
        })
      );
      expect(result.pagination).toEqual({ page: 2, pageSize: 25, total: 55, totalPages: 3 });
    });

    it("clamps the page to the actual last page when the requested page is now empty", async () => {
      // 刪文後總頁數縮減時，仍以原頁碼查詢會回傳空列表且分頁元件無法導回，需以最後一頁重查。
      (prisma.post.findMany as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "p-1", status: "DRAFT" }]);
      (prisma.post.count as ReturnType<typeof vi.fn>).mockResolvedValue(21);

      const result = await postRepositoryPrisma.listForAdmin({ deleted: false, sort: "updated-desc", page: 5, pageSize: 20 });

      expect(prisma.post.findMany).toHaveBeenCalledTimes(2);
      expect((prisma.post.findMany as ReturnType<typeof vi.fn>).mock.calls[1][0]).toEqual(
        expect.objectContaining({ skip: 20, take: 20 })
      );
      expect(result.pagination).toEqual({ page: 2, pageSize: 20, total: 21, totalPages: 2 });
      expect(result.data).toHaveLength(1);
    });

    it("queries the trash explicitly instead of mixing deleted posts", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.post.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
      await postRepositoryPrisma.listForAdmin({ deleted: true, sort: "updated-desc", page: 1, pageSize: 20 });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: { not: null } }), take: 20 })
      );
    });
  });

  describe("restore", () => {
    it("clears the deletion timestamp", async () => {
      (prisma.post.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      await postRepositoryPrisma.restore("p1");
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: "p1" },
        data: { deletedAt: null },
        select: { id: true },
      });
    });
  });

  describe("publishDueScheduled", () => {
    it("publishes posts due for schedule", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "p1", slug: "s1", publishedAt: new Date() }
      ]);
      (prisma.post.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
      
      const now = new Date();
      await postRepositoryPrisma.publishDueScheduled(now);
      
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: "SCHEDULED",
            publishedAt: { lte: now },
            deletedAt: null,
          },
        })
      );
      
      expect(prisma.post.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ["p1"] } },
          data: { status: "PUBLISHED" },
        })
      );
    });
  });

  describe("listForExport", () => {
    it("returns posts with relations", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.listForExport({ orderBy: "createdAtDesc" });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          include: expect.objectContaining({
            categories: expect.anything(),
            tags: expect.anything(),
          }),
          orderBy: { createdAt: "desc" },
        })
      );
    });

    it("includes both allowRawHtml and showRawHtmlToc in each mapped record", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          slug: "p1",
          title: "Post 1",
          excerpt: "e",
          content: "c",
          coverImage: null,
          readingTime: null,
          featured: false,
          allowRawHtml: true,
          showRawHtmlToc: true,
          status: "PUBLISHED",
          publishedAt: null,
          seoTitle: null,
          seoDescription: null,
          ogImage: null,
          categories: [],
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await postRepositoryPrisma.listForExport({ orderBy: "createdAtDesc" });

      expect(result[0].allowRawHtml).toBe(true);
      expect(result[0].showRawHtmlToc).toBe(true);
    });
  });
});

describe("categoryRepositoryPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listActive", () => {
    it("returns non-deleted categories", async () => {
      (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "c1", slug: "strategy", name: "策略" },
      ]);
      const result = await categoryRepositoryPrisma.listActive({});
      expect(result).toHaveLength(1);
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });

    it("filters by showInNav when provided", async () => {
      (prisma.category.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await categoryRepositoryPrisma.listActive({ showInNav: true });
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            showInNav: true,
          }),
        })
      );
    });
  });

  describe("countActive", () => {
    it("returns count of non-deleted categories", async () => {
      (prisma.category.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);
      const result = await categoryRepositoryPrisma.countActive();
      expect(result).toBe(5);
    });
  });

  describe("getBySlug", () => {
    it("returns category when found", async () => {
      (prisma.category.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "c1",
        slug: "strategy",
        name: "策略",
      });
      const result = await categoryRepositoryPrisma.getBySlug("strategy");
      expect(result?.slug).toBe("strategy");
    });

    it("returns null when not found", async () => {
      (prisma.category.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const result = await categoryRepositoryPrisma.getBySlug("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("softDelete", () => {
    it("sets deletedAt timestamp", async () => {
      (prisma.category.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      await categoryRepositoryPrisma.softDelete("c1");
      expect(prisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "c1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });
});

describe("tagRepositoryPrisma", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listActive", () => {
    it("returns non-deleted tags", async () => {
      (prisma.tag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "t1", slug: "design", name: "設計" },
      ]);
      const result = await tagRepositoryPrisma.listActive();
      expect(result).toHaveLength(1);
    });
  });

  describe("countActive", () => {
    it("returns count of non-deleted tags", async () => {
      (prisma.tag.count as ReturnType<typeof vi.fn>).mockResolvedValue(10);
      const result = await tagRepositoryPrisma.countActive();
      expect(result).toBe(10);
    });
  });

  describe("findBySlugOrName", () => {
    it("searches by slug or name", async () => {
      (prisma.tag.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "t1", slug: "design", name: "設計" },
      ]);
      const result = await tagRepositoryPrisma.findBySlugOrName("design");
      expect(result).toHaveLength(1);
      expect(prisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ slug: "design" }),
              expect.objectContaining({ name: "design" }),
            ]),
          }),
        })
      );
    });
  });

  describe("softDelete", () => {
    it("sets deletedAt timestamp", async () => {
      (prisma.tag.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
      await tagRepositoryPrisma.softDelete("t1");
      expect(prisma.tag.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "t1" },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });
});

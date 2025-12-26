import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
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
  },
}));

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
  });

  describe("countPublished", () => {
    it("returns count of published posts", async () => {
      (prisma.post.count as ReturnType<typeof vi.fn>).mockResolvedValue(42);
      const result = await postRepositoryPrisma.countPublished();
      expect(result).toBe(42);
      expect(prisma.post.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "PUBLISHED", deletedAt: null },
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
      expect(prisma.post.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ["p1", "p2", "p3"] },
          }),
          data: expect.objectContaining({ status: "PUBLISHED" }),
        })
      );
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
      });
      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "s",
            categories: { connect: [{ id: "c1" }] },
            tags: { connect: [{ id: "t1" }] },
          }),
        })
      );
    });
  });

  describe("update", () => {
    it("updates post fields and relations", async () => {
      (prisma.post.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "p1" });
      await postRepositoryPrisma.update("p1", {
        title: "new",
        categoryIds: ["c2"],
        tagIds: [],
      });
      expect(prisma.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "p1" },
          data: expect.objectContaining({
            title: "new",
            categories: { set: [{ id: "c2" }] },
            tags: { set: [] },
          }),
        })
      );
    });
  });

  describe("search", () => {
    it("searches title and excerpt", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.search({ query: "keyword" });
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { title: { contains: "keyword", mode: "insensitive" } },
              { excerpt: { contains: "keyword", mode: "insensitive" } },
            ]),
          }),
        })
      );
    });
  });

  describe("listForAdmin", () => {
    it("returns non-deleted posts ordered by update time", async () => {
      (prisma.post.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      await postRepositoryPrisma.listForAdmin();
      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
        })
      );
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

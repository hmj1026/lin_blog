import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPostsUseCases } from "@/modules/posts/application/use-cases";

describe("categories use cases", () => {
  const posts = {
    listPublished: vi.fn(),
    listPublishedPaginated: vi.fn(),
    search: vi.fn(),
    listForAdmin: vi.fn(),
    countPublished: vi.fn(),
    countActive: vi.fn(),
    listPublishedForSitemap: vi.fn(),
    getBySlug: vi.fn(),
    getById: vi.fn(),
    listRelated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    batchAction: vi.fn(),
    publishDueScheduled: vi.fn(),
    listForExport: vi.fn(),
  };
  const versions = {
    listByPostId: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
  };
  const categories = {
    listActive: vi.fn(),
    listAll: vi.fn(),
    countActive: vi.fn(),
    getBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };
  const tags = {
    listActive: vi.fn(),
    listAll: vi.fn(),
    countActive: vi.fn(),
    findBySlugOrName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };

  const useCases = createPostsUseCases({ posts, versions, categories, tags });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("category operations", () => {
    it("listAllCategories() returns all categories", async () => {
      categories.listAll.mockResolvedValue([
        { id: "c1", slug: "strategy", name: "策略", showInNav: true, navOrder: 1 },
        { id: "c2", slug: "design", name: "設計", showInNav: true, navOrder: 2 },
      ]);
      const result = await useCases.listAllCategories();
      expect(categories.listAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("listActiveCategories() filters by showInNav", async () => {
      categories.listActive.mockResolvedValue([
        { id: "c1", slug: "strategy", name: "策略" },
      ]);
      const result = await useCases.listActiveCategories({ showInNav: true });
      expect(categories.listActive).toHaveBeenCalledWith({ showInNav: true });
      expect(result).toHaveLength(1);
    });

    it("getCategoryBySlug() returns category", async () => {
      categories.getBySlug.mockResolvedValue({
        id: "c1",
        slug: "strategy",
        name: "策略",
      });
      const result = await useCases.getCategoryBySlug("strategy");
      expect(categories.getBySlug).toHaveBeenCalledWith("strategy");
      expect(result?.slug).toBe("strategy");
    });

    it("getCategoryBySlug() returns null for non-existent", async () => {
      categories.getBySlug.mockResolvedValue(null);
      const result = await useCases.getCategoryBySlug("non-existent");
      expect(result).toBeNull();
    });

    it("countActiveCategories() returns count", async () => {
      categories.countActive.mockResolvedValue(3);
      const result = await useCases.countActiveCategories();
      expect(result).toBe(3);
    });

    it("createCategory() validates and creates", async () => {
      categories.create.mockResolvedValue({ id: "new-cat" });
      const result = await useCases.createCategory({
        slug: "new-category",
        name: "新分類",
      });
      expect(categories.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "new-category",
          name: "新分類",
        })
      );
      expect(result.id).toBe("new-cat");
    });

    it("updateCategory() validates and updates", async () => {
      categories.update.mockResolvedValue({ id: "c1" });
      await useCases.updateCategory("c1", {
        slug: "updated-slug",
        name: "更新的分類",
        showInNav: false,
        navOrder: 10,
      });
      expect(categories.update).toHaveBeenCalledWith(
        "c1",
        expect.objectContaining({
          slug: "updated-slug",
          name: "更新的分類",
          showInNav: false,
          navOrder: 10,
        })
      );
    });

    it("removeCategory() calls softDelete", async () => {
      categories.softDelete.mockResolvedValue(undefined);
      await useCases.removeCategory("c1");
      expect(categories.softDelete).toHaveBeenCalledWith("c1");
    });
  });
});

describe("tags use cases", () => {
  const posts = {
    listPublished: vi.fn(),
    listPublishedPaginated: vi.fn(),
    search: vi.fn(),
    listForAdmin: vi.fn(),
    countPublished: vi.fn(),
    countActive: vi.fn(),
    listPublishedForSitemap: vi.fn(),
    getBySlug: vi.fn(),
    getById: vi.fn(),
    listRelated: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    batchAction: vi.fn(),
    publishDueScheduled: vi.fn(),
    listForExport: vi.fn(),
  };
  const versions = {
    listByPostId: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
  };
  const categories = {
    listActive: vi.fn(),
    listAll: vi.fn(),
    countActive: vi.fn(),
    getBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };
  const tags = {
    listActive: vi.fn(),
    listAll: vi.fn(),
    countActive: vi.fn(),
    findBySlugOrName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  };

  const useCases = createPostsUseCases({ posts, versions, categories, tags });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tag operations", () => {
    it("listAllTags() returns all tags", async () => {
      tags.listAll.mockResolvedValue([
        { id: "t1", slug: "design", name: "設計" },
        { id: "t2", slug: "ux", name: "UX" },
      ]);
      const result = await useCases.listAllTags();
      expect(tags.listAll).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it("listActiveTags() returns active tags", async () => {
      tags.listActive.mockResolvedValue([{ id: "t1", slug: "design", name: "設計" }]);
      const result = await useCases.listActiveTags();
      expect(tags.listActive).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it("findTagsBySlugOrName() searches tags", async () => {
      tags.findBySlugOrName.mockResolvedValue([
        { id: "t1", slug: "design", name: "設計" },
      ]);
      const result = await useCases.findTagsBySlugOrName("design");
      expect(tags.findBySlugOrName).toHaveBeenCalledWith("design");
      expect(result).toHaveLength(1);
    });

    it("countActiveTags() returns count", async () => {
      tags.countActive.mockResolvedValue(5);
      const result = await useCases.countActiveTags();
      expect(result).toBe(5);
    });

    it("createTag() validates and creates", async () => {
      tags.create.mockResolvedValue({ id: "new-tag" });
      const result = await useCases.createTag({
        slug: "new-tag",
        name: "新標籤",
      });
      expect(tags.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "new-tag",
          name: "新標籤",
        })
      );
      expect(result.id).toBe("new-tag");
    });

    it("updateTag() validates and updates", async () => {
      tags.update.mockResolvedValue({ id: "t1" });
      await useCases.updateTag("t1", {
        slug: "updated-slug",
        name: "更新的標籤",
      });
      expect(tags.update).toHaveBeenCalledWith(
        "t1",
        expect.objectContaining({
          slug: "updated-slug",
          name: "更新的標籤",
        })
      );
    });

    it("removeTag() calls softDelete", async () => {
      tags.softDelete.mockResolvedValue(undefined);
      await useCases.removeTag("t1");
      expect(tags.softDelete).toHaveBeenCalledWith("t1");
    });
  });
});

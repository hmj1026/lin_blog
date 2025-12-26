import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPostsUseCases } from "@/modules/posts/application/use-cases";

describe("posts use cases", () => {
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

  const useCases = createPostsUseCases({
    posts,
    versions,
    categories,
    tags,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createPost() sanitizes HTML content", async () => {
    posts.create.mockResolvedValue({ id: "1" });
    await useCases.createPost({
      slug: "slug-1",
      title: "Title",
      excerpt: "Excerpt",
      content: `<p>Hello</p><script>alert("x")</script>`,
      status: "DRAFT",
      categoryIds: [],
      tagIds: [],
    });

    const call = posts.create.mock.calls[0]?.[0];
    expect(call?.content).toContain("<p>Hello</p>");
    expect(call?.content).not.toContain("<script");
  });

  it("getReadablePostBySlug() hides drafts unless allowDraft", async () => {
    posts.getBySlug.mockResolvedValue({
      id: "1",
      slug: "s",
      title: "t",
      excerpt: "e",
      content: "<p></p>",
      coverImage: null,
      readingTime: null,
      featured: false,
      status: "DRAFT",
      publishedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      author: null,
      categories: [],
      tags: [],
    });

    const denied = await useCases.getReadablePostBySlug({ slug: "s", allowDraft: false });
    expect(denied).toBeNull();

    const allowed = await useCases.getReadablePostBySlug({ slug: "s", allowDraft: true });
    expect(allowed?.id).toBe("1");
  });

  it("listRelatedPublishedPosts() calls repo with ids and take=3", async () => {
    posts.listRelated.mockResolvedValue([]);
    await useCases.listRelatedPublishedPosts({
      post: { slug: "p", categories: [{ id: "c1" }, { id: "c2" }], tags: [{ id: "t1" }] },
    });

    expect(posts.listRelated).toHaveBeenCalledWith({
      excludeSlug: "p",
      categoryIds: ["c1", "c2"],
      tagIds: ["t1"],
      take: 3,
    });
  });

  it("updatePostWithVersion() saves current version before update", async () => {
    posts.getById.mockResolvedValue({
      id: "1",
      slug: "s",
      title: "old",
      excerpt: "e",
      content: "<p>old</p>",
      coverImage: null,
      readingTime: null,
      featured: false,
      status: "DRAFT",
      publishedAt: null,
      seoTitle: null,
      seoDescription: null,
      ogImage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      author: null,
      categories: [],
      tags: [],
    });
    versions.create.mockResolvedValue({ id: "v1" });
    posts.update.mockResolvedValue({ id: "1" });

    await useCases.updatePostWithVersion(
      "1",
      {
        slug: "s",
        title: "new",
        excerpt: "e2",
        content: `<p>new</p>`,
        status: "DRAFT",
        categoryIds: [],
        tagIds: [],
      },
      "editor-1"
    );

    expect(versions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        postId: "1",
        title: "old",
        editorId: "editor-1",
      })
    );
    expect(posts.update).toHaveBeenCalledWith("1", expect.objectContaining({ title: "new" }));
  });

  it("removePost() calls softDelete", async () => {
    posts.softDelete.mockResolvedValue(undefined);
    await useCases.removePost("post-123");
    expect(posts.softDelete).toHaveBeenCalledWith("post-123");
  });

  it("batchPostAction() processes multiple posts", async () => {
    posts.batchAction.mockResolvedValue({ affected: 2 });
    const result = await useCases.batchPostAction({
      action: "publish",
      postIds: ["p1", "p2"],
    });
    expect(posts.batchAction).toHaveBeenCalledWith({
      action: "publish",
      postIds: ["p1", "p2"],
    });
    expect(result).toEqual({ affected: 2 });
  });

  it("listActiveCategories() calls repo", async () => {
    categories.listActive.mockResolvedValue([{ id: "c1", name: "策略", slug: "strategy" }]);
    const result = await useCases.listActiveCategories();
    expect(categories.listActive).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("listActiveTags() calls repo", async () => {
    tags.listActive.mockResolvedValue([{ id: "t1", name: "設計", slug: "design" }]);
    const result = await useCases.listActiveTags();
    expect(tags.listActive).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });

  it("updatePost() sanitizes HTML and updates", async () => {
    posts.update.mockResolvedValue({ id: "1" });
    await useCases.updatePost("1", {
      slug: "test",
      title: "Test",
      excerpt: "test",
      content: `<p>Safe</p><script>bad</script>`,
      status: "PUBLISHED",
      categoryIds: [],
      tagIds: [],
      featured: true,
    });

    const call = posts.update.mock.calls[0];
    expect(call?.[1]?.content).not.toContain("<script");
    expect(call?.[1]?.featured).toBe(true);
  });
  it("publishScheduledPosts() calls repo with date", async () => {
    posts.publishDueScheduled.mockResolvedValue({ count: 5 });
    const now = new Date();
    await useCases.publishScheduledPosts(now);
    expect(posts.publishDueScheduled).toHaveBeenCalledWith(now);
  });

  it("restorePostVersion() updates post with version content", async () => {
    versions.getById.mockResolvedValue({
      id: "v1",
      postId: "p1",
      title: "old title",
      content: "old content",
      excerpt: "old excerpt",
      createdAt: new Date(),
    });
    posts.update.mockResolvedValue({ id: "p1" });
    
    await useCases.restorePostVersion("p1", "v1", "editor-1");
    
    expect(versions.getById).toHaveBeenCalledWith({ postId: "p1", versionId: "v1" });
    expect(versions.create).toHaveBeenCalledWith(expect.objectContaining({ editorId: "editor-1" }));
    expect(posts.update).toHaveBeenCalledWith("p1", expect.objectContaining({
      title: "old title",
      content: "old content",
      excerpt: "old excerpt",
    }));
  });

  it("count methods delegate to repo", async () => {
    posts.countPublished.mockResolvedValue(10);
    posts.countActive.mockResolvedValue(15);
    categories.countActive.mockResolvedValue(3);
    tags.countActive.mockResolvedValue(5);

    expect(await useCases.countPublishedPosts()).toBe(10);
    expect(await useCases.countActivePosts()).toBe(15);
    expect(await useCases.countActiveCategories()).toBe(3);
    expect(await useCases.countActiveTags()).toBe(5);
  });

  describe("importPosts", () => {
    const importData = [
        { slug: "s1", title: "t1", excerpt: "e1", content: "c1" },
        { slug: "s2", title: "t2", excerpt: "e2", content: "c2" } 
    ];

    it("creates new posts", async () => {
        posts.getBySlug.mockResolvedValue(null); // No existing
        const result = await useCases.importPosts({ posts: importData });
        
        expect(result.created).toBe(2);
        expect(posts.create).toHaveBeenCalledTimes(2);
    });

    it("skips existing posts by default", async () => {
        posts.getBySlug.mockResolvedValue({ id: "existing", deletedAt: null });
        const result = await useCases.importPosts({ posts: importData });
        
        expect(result.created).toBe(0);
        expect(result.skipped).toBe(2);
        expect(posts.create).not.toHaveBeenCalled();
        expect(posts.update).not.toHaveBeenCalled();
    });

    it("overwrites existing posts if mode=overwrite", async () => {
        posts.getBySlug.mockResolvedValue({ id: "existing", deletedAt: null });
        const result = await useCases.importPosts({ posts: importData, mode: "overwrite" });
        
        expect(result.updated).toBe(2);
        expect(posts.update).toHaveBeenCalledTimes(2);
    });

    it("handles errors gracefully", async () => {
        // Missing required field
        const invalidData = [{ slug: "s3" }]; 
        // @ts-ignore
        const result = await useCases.importPosts({ posts: invalidData });
        
        expect(result.errors.length).toBe(1);
    });
  });

  describe("exportPosts", () => {
    it("exports all posts when no ids provided", async () => {
      posts.listForExport.mockResolvedValue([
        { slug: "p1", title: "Post 1", content: "content1" },
        { slug: "p2", title: "Post 2", content: "content2" },
      ]);
      
      const result = await useCases.exportPosts({});
      
      expect(posts.listForExport).toHaveBeenCalledWith(expect.objectContaining({ ids: undefined }));
      expect(result).toHaveLength(2);
    });

    it("exports specific posts by ids", async () => {
      posts.listForExport.mockResolvedValue([
        { slug: "p1", title: "Post 1", content: "content1" },
      ]);
      
      const result = await useCases.exportPosts({ ids: ["id1"] });
      
      expect(posts.listForExport).toHaveBeenCalledWith(expect.objectContaining({ ids: ["id1"] }));
      expect(result).toHaveLength(1);
    });
  });

  describe("restorePostVersion error handling", () => {
    it("returns error when version not found", async () => {
      versions.getById.mockResolvedValue(null);

      const result = await useCases.restorePostVersion("p1", "nonexistent", "editor-1");
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("version-not-found");
      }
    });

    it("returns error when post not found", async () => {
      versions.getById.mockResolvedValue({ id: "v1", postId: "p1", title: "t", content: "c", excerpt: "e" });
      posts.getById.mockResolvedValue(null);

      const result = await useCases.restorePostVersion("p1", "v1", "editor-1");
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("post-not-found");
      }
    });
  });

  describe("category CRUD", () => {
    it("createCategory calls repo with parsed data", async () => {
      categories.create.mockResolvedValue({ id: "c1" });
      await useCases.createCategory({ name: "Test Category", slug: "test-category" });
      expect(categories.create).toHaveBeenCalledWith(expect.objectContaining({
        name: "Test Category",
        slug: "test-category",
      }));
    });

    it("updateCategory calls repo with parsed data", async () => {
      categories.update.mockResolvedValue({ id: "c1" });
      await useCases.updateCategory("c1", { name: "Updated", slug: "updated-name" });
      expect(categories.update).toHaveBeenCalledWith("c1", expect.objectContaining({
        name: "Updated",
        slug: "updated-name",
      }));
    });

    it("removeCategory calls softDelete", async () => {
      categories.softDelete.mockResolvedValue(undefined);
      await useCases.removeCategory("c1");
      expect(categories.softDelete).toHaveBeenCalledWith("c1");
    });
  });

  describe("tag CRUD", () => {
    it("createTag calls repo with parsed data", async () => {
      tags.create.mockResolvedValue({ id: "t1" });
      await useCases.createTag({ name: "Test Tag", slug: "test-tag" });
      expect(tags.create).toHaveBeenCalledWith(expect.objectContaining({
        name: "Test Tag",
        slug: "test-tag",
      }));
    });

    it("updateTag calls repo with parsed data", async () => {
      tags.update.mockResolvedValue({ id: "t1" });
      await useCases.updateTag("t1", { name: "Updated", slug: "updated-name" });
      expect(tags.update).toHaveBeenCalledWith("t1", expect.objectContaining({
        name: "Updated",
        slug: "updated-name",
      }));
    });

    it("removeTag calls softDelete", async () => {
      tags.softDelete.mockResolvedValue(undefined);
      await useCases.removeTag("t1");
      expect(tags.softDelete).toHaveBeenCalledWith("t1");
    });
  });

  describe("query methods", () => {
    it("listPublishedPostsPaginated calls repo with params", async () => {
      posts.listPublishedPaginated.mockResolvedValue({ posts: [], total: 0 });
      await useCases.listPublishedPostsPaginated({ page: 1, pageSize: 10 });
      expect(posts.listPublishedPaginated).toHaveBeenCalled();
    });

    it("searchPosts calls repo", async () => {
      posts.search.mockResolvedValue([]);
      await useCases.searchPosts({ query: "test" });
      expect(posts.search).toHaveBeenCalledWith({ query: "test", take: undefined });
    });

    it("listAdminPosts calls repo", async () => {
      posts.listForAdmin.mockResolvedValue([]);
      await useCases.listAdminPosts();
      expect(posts.listForAdmin).toHaveBeenCalled();
    });

    it("listPublishedForSitemap calls repo", async () => {
      posts.listPublishedForSitemap.mockResolvedValue([]);
      await useCases.listPublishedForSitemap();
      expect(posts.listPublishedForSitemap).toHaveBeenCalled();
    });

    it("getPostBySlug calls repo", async () => {
      posts.getBySlug.mockResolvedValue({ id: "1" });
      await useCases.getPostBySlug("test-slug");
      expect(posts.getBySlug).toHaveBeenCalledWith("test-slug");
    });

    it("getPostById calls repo", async () => {
      posts.getById.mockResolvedValue({ id: "1" });
      await useCases.getPostById("id1");
      expect(posts.getById).toHaveBeenCalledWith("id1");
    });

    it("listAllCategories calls repo", async () => {
      categories.listAll.mockResolvedValue([]);
      await useCases.listAllCategories();
      expect(categories.listAll).toHaveBeenCalled();
    });

    it("getCategoryBySlug calls repo", async () => {
      categories.getBySlug.mockResolvedValue({ id: "c1" });
      await useCases.getCategoryBySlug("test");
      expect(categories.getBySlug).toHaveBeenCalledWith("test");
    });

    it("listAllTags calls repo", async () => {
      tags.listAll.mockResolvedValue([]);
      await useCases.listAllTags();
      expect(tags.listAll).toHaveBeenCalled();
    });

    it("findTagsBySlugOrName calls repo", async () => {
      tags.findBySlugOrName.mockResolvedValue([]);
      await useCases.findTagsBySlugOrName("test");
      expect(tags.findBySlugOrName).toHaveBeenCalledWith("test");
    });

    it("listPostVersions calls repo", async () => {
      versions.listByPostId.mockResolvedValue([]);
      await useCases.listPostVersions("p1");
      expect(versions.listByPostId).toHaveBeenCalledWith("p1");
    });

    it("getPostVersion calls repo", async () => {
      versions.getById.mockResolvedValue({ id: "v1" });
      await useCases.getPostVersion("p1", "v1");
      expect(versions.getById).toHaveBeenCalledWith({ postId: "p1", versionId: "v1" });
    });
  });
});

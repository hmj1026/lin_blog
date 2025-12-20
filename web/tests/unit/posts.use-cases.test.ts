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
});

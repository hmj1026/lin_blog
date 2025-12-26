import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PostPage from "@/app/(frontend)/blog/[slug]/page";
import { postsUseCases } from "@/modules/posts";
import { getSession } from "@/lib/auth";
import { roleHasPermission } from "@/lib/rbac";
import { notFound } from "next/navigation";

// Mock dependencies
vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    getReadablePostBySlug: vi.fn(),
    listRelatedPublishedPosts: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/rbac", () => ({
  roleHasPermission: vi.fn(),
}));

vi.mock("@/lib/utils/content", () => ({
  sanitizeAndPrepareHtml: (html: string) => `Sanitized: ${html}`,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: ({ priority, unoptimized, fill, quality, blurDataURL, placeholder, loader, ...rest }: any) => 
    <img {...rest} />,
}));

// Mock components
vi.mock("@/components/author-chip", () => ({
  AuthorChip: () => <div>AuthorChip</div>,
}));
vi.mock("@/components/reading-progress", () => ({
  ReadingProgress: () => <div>ReadingProgress</div>,
}));
vi.mock("@/components/post-view-tracker", () => ({
  PostViewTracker: () => <div>PostViewTracker</div>,
}));
vi.mock("@/components/share-buttons", () => ({
  ShareButtons: () => <div>ShareButtons</div>,
}));
vi.mock("@/components/toc", () => ({
  Toc: () => <div>Toc</div>,
}));
vi.mock("@/components/newsletter-form", () => ({
  NewsletterForm: () => <div>NewsletterForm</div>,
}));
vi.mock("@/components/post-card", () => ({
  PostCard: () => <div>PostCard</div>,
}));

const mockPost = {
  slug: "test-post",
  title: "Test Post",
  content: "<p>Content</p>",
  publishedAt: new Date(),
  status: "PUBLISHED",
  hero: "/image.jpg",
  categories: [{name: "Tech", deletedAt: null}],
  tags: [{name: "React", deletedAt: null}],
  author: { name: "Author" },
  readingTime: 5,
};

describe("Post Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (postsUseCases.getReadablePostBySlug as any).mockResolvedValue(mockPost);
    (postsUseCases.listRelatedPublishedPosts as any).mockResolvedValue([]);
    (getSession as any).mockResolvedValue(null);
  });

  it("renders post content", async () => {
    const params = Promise.resolve({ slug: "test-post" });
    const ui = await PostPage({ params });
    render(ui);

    expect(screen.getByText("Test Post")).toBeInTheDocument();
    // content is rendered as HTML, so we check for the text content
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText(/Sanitized/)).toBeInTheDocument();
  });

  it("calls notFound if post not found", async () => {
    (postsUseCases.getReadablePostBySlug as any).mockResolvedValue(null);
    const params = Promise.resolve({ slug: "not-found" });
    await PostPage({ params });
    expect(notFound).toHaveBeenCalled();
  });

  it("checks permissions for draft preview", async () => {
    const params = Promise.resolve({ slug: "draft-post" });
    const searchParams = Promise.resolve({ preview: "true" });
    
    // Simulate admin login
    (getSession as any).mockResolvedValue({ user: { roleId: "admin" } });
    (roleHasPermission as any).mockResolvedValue(true);

    await PostPage({ params, searchParams });

    expect(postsUseCases.getReadablePostBySlug).toHaveBeenCalledWith(
      expect.objectContaining({ allowDraft: true })
    );
  });

  it("decodes URL-encoded slug with Chinese characters", async () => {
    // Simulate URL-encoded Chinese slug: 中文-標題
    const encodedSlug = "%E4%B8%AD%E6%96%87-%E6%A8%99%E9%A1%8C";
    const decodedSlug = "中文-標題";
    const params = Promise.resolve({ slug: encodedSlug });

    await PostPage({ params });

    expect(postsUseCases.getReadablePostBySlug).toHaveBeenCalledWith(
      expect.objectContaining({ slug: decodedSlug })
    );
  });

  it("handles already decoded slug correctly", async () => {
    const slug = "already-decoded-slug";
    const params = Promise.resolve({ slug });

    await PostPage({ params });

    expect(postsUseCases.getReadablePostBySlug).toHaveBeenCalledWith(
      expect.objectContaining({ slug })
    );
  });
});

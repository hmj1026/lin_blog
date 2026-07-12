import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PostPage from "@/app/(frontend)/blog/[slug]/page";
import { postsQueries, discoveryQueries } from "@/lib/server-queries";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

// Mock dependencies
vi.mock("@/lib/server-queries", () => ({
  postsQueries: {
    getReadablePostBySlug: vi.fn(),
    listRelatedPublishedPosts: vi.fn(),
  },
  siteSettingsQueries: {
    getDefault: vi.fn(),
  },
  discoveryQueries: {
    searchPublicPosts: vi.fn(),
    listPopularPosts: vi.fn(),
    listLatestPosts: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  draftMode: vi.fn(),
}));

vi.mock("@/lib/utils/content", () => ({
  prepareContent: (html: string) => ({ html: `Sanitized: ${html}`, tocItems: [] }),
  prepareRawHtmlContent: (html: string) => ({ html: `Raw: ${html}`, tocItems: [] }),
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
vi.mock("@/components/raw-html-post-frame", () => ({
  RawHtmlPostFrame: ({ html }: any) => <div data-testid="raw-html-frame">{html}</div>,
}));
vi.mock("@/components/discovery/streamed-post-discovery-panel", () => ({
  // async server component 無法在 RTL client render 中執行，改以同步替身驗證 variant 佈線
  StreamedPostDiscoveryPanel: ({ variant }: any) => <div data-testid={`discovery-panel-${variant}`} />,
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
    (postsQueries.getReadablePostBySlug as any).mockResolvedValue(mockPost);
    (postsQueries.listRelatedPublishedPosts as any).mockResolvedValue([]);
    (discoveryQueries.listPopularPosts as any).mockResolvedValue({ ok: true, items: [] });
    (discoveryQueries.listLatestPosts as any).mockResolvedValue({ ok: true, items: [] });
    (draftMode as any).mockResolvedValue({ isEnabled: false, enable: vi.fn(), disable: vi.fn() });
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
    (postsQueries.getReadablePostBySlug as any).mockResolvedValue(null);
    const params = Promise.resolve({ slug: "not-found" });
    await PostPage({ params });
    expect(notFound).toHaveBeenCalled();
  });

  it("allows draft preview when draftMode is enabled", async () => {
    const params = Promise.resolve({ slug: "draft-post" });

    (draftMode as any).mockResolvedValue({ isEnabled: true, enable: vi.fn(), disable: vi.fn() });

    await PostPage({ params });

    expect(postsQueries.getReadablePostBySlug).toHaveBeenCalledWith(
      expect.objectContaining({ allowDraft: true })
    );
  });

  it("decodes URL-encoded slug with Chinese characters", async () => {
    // Simulate URL-encoded Chinese slug: 中文-標題
    const encodedSlug = "%E4%B8%AD%E6%96%87-%E6%A8%99%E9%A1%8C";
    const decodedSlug = "中文-標題";
    const params = Promise.resolve({ slug: encodedSlug });

    await PostPage({ params });

    expect(postsQueries.getReadablePostBySlug).toHaveBeenCalledWith(
      expect.objectContaining({ slug: decodedSlug })
    );
  });

  it("handles already decoded slug correctly", async () => {
    const slug = "already-decoded-slug";
    const params = Promise.resolve({ slug });

    await PostPage({ params });

    expect(postsQueries.getReadablePostBySlug).toHaveBeenCalledWith(
      expect.objectContaining({ slug })
    );
  });

  it("renders raw HTML posts inside the isolated iframe frame", async () => {
    (postsQueries.getReadablePostBySlug as any).mockResolvedValue({
      ...mockPost,
      allowRawHtml: true,
      content: "<p>raw content</p>",
    });
    const params = Promise.resolve({ slug: "raw-post" });
    const ui = await PostPage({ params });
    render(ui);
    expect(screen.getByTestId("raw-html-frame")).toBeInTheDocument();
    expect(screen.getByText(/Raw:/)).toBeInTheDocument();
  });

  it("renders the sidebar and stacked discovery panels for a normal post", async () => {
    const params = Promise.resolve({ slug: "test-post" });
    const ui = await PostPage({ params });
    render(ui);

    expect(screen.getByTestId("discovery-panel-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("discovery-panel-stacked")).toBeInTheDocument();
    expect(screen.queryByTestId("discovery-panel-grid")).not.toBeInTheDocument();
  });

  it("renders only the grid discovery panel for a raw HTML post", async () => {
    (postsQueries.getReadablePostBySlug as any).mockResolvedValue({
      ...mockPost,
      allowRawHtml: true,
      content: "<p>raw content</p>",
    });
    const params = Promise.resolve({ slug: "raw-post" });
    const ui = await PostPage({ params });
    render(ui);

    expect(screen.getByTestId("discovery-panel-grid")).toBeInTheDocument();
    expect(screen.queryByTestId("discovery-panel-sidebar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("discovery-panel-stacked")).not.toBeInTheDocument();
  });
});

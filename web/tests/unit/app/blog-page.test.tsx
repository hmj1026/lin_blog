import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BlogPage from "@/app/(frontend)/blog/page";
import { postsUseCases } from "@/modules/posts";

// Mock dependencies
vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    listActiveCategories: vi.fn(),
    listActiveTags: vi.fn(),
    listPublishedPostsPaginated: vi.fn(),
  },
}));

// Mock Link
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock components
vi.mock("@/components/post-card", () => ({
  PostCard: ({ post }: any) => <div data-testid="post-card">{post.title}</div>,
}));

vi.mock("@/components/newsletter-form", () => ({
  NewsletterForm: () => <div>NewsletterForm</div>,
}));

vi.mock("@/components/pagination", () => ({
  Pagination: () => <div>Pagination</div>,
}));

const mockCategories = [{ id: "1", name: "Tech", slug: "tech" }];
const mockTags = [{ id: "1", name: "React", slug: "react" }];
const mockPaginatedResult = {
  data: [
    { 
      slug: "post-1", 
      title: "Post One", 
      publishedAt: new Date(), 
      categories: [{name: "Tech"}], 
      tags: ["React"],
      author: { name: "Author" }
    }
  ],
  pagination: {
    total: 10,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  },
};

describe("Blog Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (postsUseCases.listActiveCategories as any).mockResolvedValue(mockCategories);
    (postsUseCases.listActiveTags as any).mockResolvedValue(mockTags);
    (postsUseCases.listPublishedPostsPaginated as any).mockResolvedValue(mockPaginatedResult);
  });

  it("renders blog page content", async () => {
    const ui = await BlogPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByText("部落格：策略 × 設計 × 社群")).toBeInTheDocument();
    expect(screen.getByText("Tech")).toBeInTheDocument(); // Category filter
    expect(screen.getByText("#React")).toBeInTheDocument(); // Tag filter
    expect(screen.getByText("Post One")).toBeInTheDocument();
  });

  it("handles pagination and filters", async () => {
    const searchParams = Promise.resolve({ page: "2", category: "tech" });
    const ui = await BlogPage({ searchParams });
    render(ui);

    expect(postsUseCases.listPublishedPostsPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        categorySlug: "tech",
      })
    );
  });

  it("renders empty state", async () => {
    (postsUseCases.listPublishedPostsPaginated as any).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, pageSize: 10, totalPages: 0 },
    });

    const ui = await BlogPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByText("找不到符合的文章，換個分類或標籤試試。")).toBeInTheDocument();
  });
});

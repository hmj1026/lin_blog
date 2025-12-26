import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/(frontend)/page";
import { postsUseCases } from "@/modules/posts";
import { siteSettingsUseCases } from "@/modules/site-settings";

// Mock dependencies
vi.mock("@/modules/posts", () => ({
  postsUseCases: {
    listPublishedPosts: vi.fn(),
    listActiveCategories: vi.fn(),
  },
}));

vi.mock("@/modules/site-settings", () => ({
  siteSettingsUseCases: {
    getOrCreateDefault: vi.fn(),
  },
}));

// Mock Next.js Link & Image
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: ({ priority, unoptimized, fill, quality, blurDataURL, placeholder, loader, ...rest }: any) => 
    <img {...rest} />,
}));

// Mock components
vi.mock("@/components/post-card", () => ({
  PostCard: ({ post }: any) => <div data-testid="post-card">{post.title}</div>,
}));

vi.mock("@/components/section-header", () => ({
  SectionHeader: ({ title }: any) => <div>{title}</div>,
}));

vi.mock("@/components/newsletter-form", () => ({
  NewsletterForm: () => <div>NewsletterForm</div>,
}));

const mockSettings = {
  heroTitle: "Hero Title",
  heroSubtitle: "Hero Subtitle",
  featuredTitle: "Featured",
  latestTitle: "Latest",
  categoriesTitle: "Categories",
  showNewsletter: true,
};

const mockPosts = [
  { 
    slug: "post-1", 
    title: "Post One", 
    publishedAt: new Date(),
    categories: [],
    tags: [],
    author: { name: "Author", image: null }
  },
];

const mockCategories = [
  { id: "1", name: "Tech", slug: "tech" },
];

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (siteSettingsUseCases.getOrCreateDefault as any).mockResolvedValue(mockSettings);
    (postsUseCases.listPublishedPosts as any).mockResolvedValue(mockPosts);
    (postsUseCases.listActiveCategories as any).mockResolvedValue(mockCategories);
  });

  it("renders hero section and content", async () => {
    const ui = await Home();
    render(ui);

    expect(screen.getByText("Hero Title")).toBeInTheDocument();
    expect(screen.getByText("Hero Subtitle")).toBeInTheDocument();
  });

  it("renders featured and latest posts", async () => {
    const ui = await Home();
    render(ui);

    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByText("Latest")).toBeInTheDocument();
    // PostCard mock renders title
    expect(screen.getAllByText("Post One").length).toBeGreaterThan(0);
  });

  it("renders categories", async () => {
    const ui = await Home();
    render(ui);

    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("Tech")).toBeInTheDocument();
  });
});

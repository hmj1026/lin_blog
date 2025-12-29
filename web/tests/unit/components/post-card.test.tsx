import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PostCard } from "@/components/post-card";
import { FrontendPost } from "@/lib/frontend/post";

const mockPost: FrontendPost = {
  slug: "test-post",
  title: "Test Post Title",
  excerpt: "This is a test excerpt.",
  category: "Test Category",
  tags: ["tag1", "tag2"],
  date: "2024-01-01",
  readingTime: "5 min",
  hero: "/images/hero.jpg",
  featured: false,
  author: {
    name: "Test Author",
    title: "Tester",
    initials: "TA",
    tone: "blue",
  },
};

describe("PostCard", () => {
  it("renders post information correctly", () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText("Test Post Title")).toBeInTheDocument();
    expect(screen.getByText("This is a test excerpt.")).toBeInTheDocument();
    expect(screen.getByText("Test Category")).toBeInTheDocument();
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("tag1")).toBeInTheDocument();
    expect(screen.getByText("tag2")).toBeInTheDocument();
  });

  it("links to correct blog slug", () => {
    render(<PostCard post={mockPost} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/blog/test-post");
  });

  it("applies horizontal layout classes with adaptive grid", () => {
    const { container } = render(<PostCard post={mockPost} layout="horizontal" />);
    const link = container.querySelector("a");
    // Horizontal layout uses grid with 2:3 ratio on lg for text emphasis
    expect(link).toHaveClass("grid", "grid-cols-1");
    expect(link?.className).toContain("md:grid-cols-2");
    expect(link?.className).toContain("lg:grid-cols-[2fr_3fr]");
  });

  it("applies vertical layout classes (default)", () => {
    const { container } = render(<PostCard post={mockPost} />);
    const link = container.querySelector("a");
    // Vertical layout uses flex flex-col
    expect(link?.className).toContain("flex");
    expect(link?.className).toContain("flex-col");
  });

  it("uses dynamic aspect-ratio for image sizing", () => {
    const { container } = render(<PostCard post={mockPost} />);
    // 預設使用 aspect-video，載入後會根據實際尺寸調整
    const imageContainer = container.querySelector('[class*="aspect-"]');
    expect(imageContainer).toBeInTheDocument();
    expect(imageContainer?.className).toContain("aspect-video");
  });

  it("applies object-cover for full-bleed images", () => {
    const { container } = render(<PostCard post={mockPost} />);
    const image = container.querySelector("img");
    expect(image?.className).toContain("object-cover");
  });

  it("applies line-clamp-2 to excerpt for truncation", () => {
    const { container } = render(<PostCard post={mockPost} />);
    const excerpt = container.querySelector(".line-clamp-2");
    expect(excerpt).toBeInTheDocument();
    expect(excerpt?.textContent).toBe("This is a test excerpt.");
  });

  it("limits displayed tags to 3", () => {
    const postWithManyTags: FrontendPost = {
      ...mockPost,
      tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
    };
    render(<PostCard post={postWithManyTags} />);
    
    // Should only show first 3 tags (without # prefix)
    expect(screen.getByText("tag1")).toBeInTheDocument();
    expect(screen.getByText("tag2")).toBeInTheDocument();
    expect(screen.getByText("tag3")).toBeInTheDocument();
    expect(screen.queryByText("tag4")).not.toBeInTheDocument();
    expect(screen.queryByText("tag5")).not.toBeInTheDocument();
  });

  it("renders read more indicator", () => {
    render(<PostCard post={mockPost} />);
    expect(screen.getByText("繼續閱讀")).toBeInTheDocument();
  });

  it("applies dark mode accent shadow classes", () => {
    const { container } = render(<PostCard post={mockPost} />);
    const link = container.querySelector("a");
    expect(link?.className).toContain("dark:shadow-xl");
    expect(link?.className).toContain("dark:shadow-accent-500/5");
  });
});


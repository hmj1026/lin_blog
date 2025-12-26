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
  content: [],
};

describe("PostCard", () => {
  it("renders post information correctly", () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText("Test Post Title")).toBeInTheDocument();
    expect(screen.getByText("This is a test excerpt.")).toBeInTheDocument();
    expect(screen.getByText("Test Category")).toBeInTheDocument();
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("#tag1")).toBeInTheDocument();
    expect(screen.getByText("#tag2")).toBeInTheDocument();
  });

  it("links to correct blog slug", () => {
    render(<PostCard post={mockPost} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/blog/test-post");
  });

  it("applies horizontal layout classes", () => {
    const { container } = render(<PostCard post={mockPost} layout="horizontal" />);
    const link = container.querySelector("a");
    // Horizontal layout uses grid
    expect(link).toHaveClass("grid", "grid-cols-1");
  });

  it("applies vertical layout classes (default)", () => {
    const { container } = render(<PostCard post={mockPost} />);
    const link = container.querySelector("a");
    // Vertical layout uses space-y-4
    expect(link).toHaveClass("space-y-4");
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PostMiniList } from "@/components/discovery/post-mini-list";
import type { DiscoverySectionState } from "@/components/discovery/types";

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

const contentState = (slugs: string[]): DiscoverySectionState => ({
  status: "content",
  items: slugs.map((slug) => ({
    slug,
    title: `Title ${slug}`,
    excerpt: "excerpt",
    coverImage: null,
    publishedAt: null,
    category: null,
  })),
});

describe("PostMiniList", () => {
  it("renders the section heading and each item as a link to its post", () => {
    render(<PostMiniList title="熱門文章" state={contentState(["a", "b"])} emptyMessage="empty" />);

    expect(screen.getByRole("heading", { name: "熱門文章" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Title a/ })).toHaveAttribute("href", "/blog/a");
    expect(screen.getByRole("link", { name: /Title b/ })).toHaveAttribute("href", "/blog/b");
  });

  it("uses the post slug as a stable React key (no duplicate-key warning) even with repeated titles", () => {
    render(
      <PostMiniList
        title="最新文章"
        state={{
          status: "content",
          items: [
            { slug: "x", title: "Same", excerpt: "", coverImage: null, publishedAt: null, category: null },
            { slug: "y", title: "Same", excerpt: "", coverImage: null, publishedAt: null, category: null },
          ],
        }}
        emptyMessage="empty"
      />
    );

    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("shows the empty message when there are no items", () => {
    render(<PostMiniList title="熱門文章" state={{ status: "empty" }} emptyMessage="目前沒有熱門文章" />);

    expect(screen.getByText("目前沒有熱門文章")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows a generic error message and no items when the query failed", () => {
    render(<PostMiniList title="熱門文章" state={{ status: "error" }} emptyMessage="empty" />);

    expect(screen.getByRole("status")).toHaveTextContent(/暫時無法載入/);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

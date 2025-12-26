import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Pagination } from "@/components/pagination";

describe("Pagination", () => {
  const baseUrl = "/blog";

  it("does not render if totalPages <= 1", () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} baseUrl={baseUrl} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders page numbers correctly for small total", () => {
    render(<Pagination currentPage={1} totalPages={3} baseUrl={baseUrl} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders ellipses for large total", () => {
    render(<Pagination currentPage={5} totalPages={10} baseUrl={baseUrl} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    // Should show ellipses
    const dots = screen.getAllByText("...");
    expect(dots.length).toBeGreaterThan(0);
  });

  it("disables prev button on first page", () => {
    render(<Pagination currentPage={1} totalPages={5} baseUrl={baseUrl} />);
    // "上一頁" should be a span, not a link
    const prevText = screen.getByText("上一頁");
    expect(prevText.tagName).toBe("SPAN");
    
    const nextLink = screen.getByRole("link", { name: "下一頁" });
    expect(nextLink).toBeInTheDocument();
  });

  it("disables next button on last page", () => {
    render(<Pagination currentPage={5} totalPages={5} baseUrl={baseUrl} />);
    const nextText = screen.getByText("下一頁");
    expect(nextText.tagName).toBe("SPAN");

    const prevLink = screen.getByRole("link", { name: "上一頁" });
    expect(prevLink).toBeInTheDocument();
  });

  it("includes query params in links", () => {
    render(<Pagination currentPage={1} totalPages={5} baseUrl={baseUrl} queryParams={{ q: "search" }} />);
    const page2 = screen.getByRole("link", { name: "2" });
    expect(page2).toHaveAttribute("href", "/blog?q=search&page=2");
  });
});

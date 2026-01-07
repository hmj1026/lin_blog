import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InlineToc } from "@/components/inline-toc";

describe("InlineToc", () => {
  it("renders nothing when less than 2 headings", () => {
    const { container } = render(<InlineToc html="<h2>Only One</h2>" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no headings", () => {
    const { container } = render(<InlineToc html="<p>No headings here</p>" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toc when 2 or more headings", () => {
    const html = "<h2>First</h2><h2>Second</h2>";
    render(<InlineToc html={html} />);

    expect(screen.getByRole("navigation", { name: "目錄" })).toBeInTheDocument();
    expect(screen.getByText("目錄")).toBeInTheDocument();
  });

  it("displays hierarchical numbers for H2", () => {
    const html = "<h2>Chapter 1</h2><h2>Chapter 2</h2><h2>Chapter 3</h2>";
    render(<InlineToc html={html} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("displays hierarchical numbers for H3 as 1.1, 1.2", () => {
    const html = "<h2>Chapter 1</h2><h3>Section A</h3><h3>Section B</h3><h2>Chapter 2</h2><h3>Section C</h3>";
    render(<InlineToc html={html} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1.1")).toBeInTheDocument();
    expect(screen.getByText("1.2")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("2.1")).toBeInTheDocument();
  });

  it("creates anchor links to headings", () => {
    const html = '<h2 id="intro">Introduction</h2><h2 id="conclusion">Conclusion</h2>';
    render(<InlineToc html={html} />);

    const introLink = screen.getByRole("link", { name: "Introduction" });
    const conclusionLink = screen.getByRole("link", { name: "Conclusion" });

    expect(introLink).toHaveAttribute("href", "#intro");
    expect(conclusionLink).toHaveAttribute("href", "#conclusion");
  });

  it("handles mixed H2 and H3 headings", () => {
    const html = "<h2>Main</h2><h3>Sub</h3><h2>Another Main</h2>";
    render(<InlineToc html={html} />);

    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByText("Sub")).toBeInTheDocument();
    expect(screen.getByText("Another Main")).toBeInTheDocument();
  });

  it("applies indentation class to H3 items", () => {
    const html = "<h2>Main</h2><h3>Subsection</h3>";
    const { container } = render(<InlineToc html={html} />);

    // H3 項目應有 ml-6 類別
    const listItems = container.querySelectorAll("li");
    expect(listItems[1]).toHaveClass("ml-6");
    expect(listItems[0]).not.toHaveClass("ml-6");
  });
});


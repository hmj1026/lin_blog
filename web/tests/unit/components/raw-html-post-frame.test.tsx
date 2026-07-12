import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RawHtmlPostFrame } from "@/components/raw-html-post-frame";
import type { TocItem } from "@/lib/utils/toc";

const twoTocItems: TocItem[] = [
  { id: "first", text: "First", level: 2 },
  { id: "second", text: "Second", level: 2 },
];

const oneTocItem: TocItem[] = [{ id: "first", text: "First", level: 2 }];

describe("RawHtmlPostFrame", () => {
  it("does not render the system TOC when showRawHtmlToc is omitted, even with >=2 headings", () => {
    render(<RawHtmlPostFrame html="<p>content</p>" tocItems={twoTocItems} />);

    expect(screen.queryByRole("navigation", { name: "目錄" })).not.toBeInTheDocument();
  });

  it("does not render the system TOC when showRawHtmlToc is false, even with >=2 headings", () => {
    render(<RawHtmlPostFrame html="<p>content</p>" tocItems={twoTocItems} showRawHtmlToc={false} />);

    expect(screen.queryByRole("navigation", { name: "目錄" })).not.toBeInTheDocument();
  });

  it("renders the system TOC when showRawHtmlToc is true and there are >=2 headings", () => {
    render(<RawHtmlPostFrame html="<p>content</p>" tocItems={twoTocItems} showRawHtmlToc={true} />);

    expect(screen.getByRole("navigation", { name: "目錄" })).toBeInTheDocument();
  });

  it("does not render the system TOC when showRawHtmlToc is true but fewer than 2 headings", () => {
    render(<RawHtmlPostFrame html="<p>content</p>" tocItems={oneTocItem} showRawHtmlToc={true} />);

    expect(screen.queryByRole("navigation", { name: "目錄" })).not.toBeInTheDocument();
  });

  it("posts a scroll message to the iframe when a TOC item is clicked", () => {
    const { container } = render(
      <RawHtmlPostFrame html="<p>content</p>" tocItems={twoTocItems} showRawHtmlToc={true} />
    );

    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    const postMessageSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: { postMessage: postMessageSpy },
      configurable: true,
    });

    fireEvent.click(screen.getByRole("button", { name: "First" }));

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: "raw-html-frame:scrollTo", id: "first" },
      "*"
    );
  });
});

import { describe, it, expect } from "vitest";
import {
  extractHeadings,
  addHeadingIds,
  processHeadings,
  type TocItem,
} from "@/lib/utils/toc";

describe("extractHeadings", () => {
  it("returns empty array for empty input", () => {
    expect(extractHeadings("")).toEqual([]);
    expect(extractHeadings(null as unknown as string)).toEqual([]);
  });

  it("extracts H2 headings", () => {
    const html = "<h2>Introduction</h2><p>Some text</p><h2>Conclusion</h2>";
    const result = extractHeadings(html);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "toc-0", text: "Introduction", level: 2 });
    expect(result[1]).toEqual({ id: "toc-1", text: "Conclusion", level: 2 });
  });

  it("extracts H3 headings", () => {
    const html = "<h3>Subsection A</h3><h3>Subsection B</h3>";
    const result = extractHeadings(html);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "toc-0", text: "Subsection A", level: 3 });
    expect(result[1]).toEqual({ id: "toc-1", text: "Subsection B", level: 3 });
  });

  it("extracts mixed H2 and H3 headings in order", () => {
    const html = `
      <h2>Chapter 1</h2>
      <h3>Section 1.1</h3>
      <h3>Section 1.2</h3>
      <h2>Chapter 2</h2>
    `;
    const result = extractHeadings(html);

    expect(result).toHaveLength(4);
    expect(result.map((i) => i.text)).toEqual([
      "Chapter 1",
      "Section 1.1",
      "Section 1.2",
      "Chapter 2",
    ]);
    expect(result.map((i) => i.level)).toEqual([2, 3, 3, 2]);
  });

  it("preserves existing IDs", () => {
    const html = '<h2 id="custom-id">Title</h2>';
    const result = extractHeadings(html);

    expect(result[0].id).toBe("custom-id");
  });

  it("handles headings with attributes", () => {
    const html = '<h2 class="fancy" id="my-title" data-test="true">Styled Title</h2>';
    const result = extractHeadings(html);

    expect(result[0]).toEqual({ id: "my-title", text: "Styled Title", level: 2 });
  });

  it("skips empty headings", () => {
    const html = "<h2></h2><h2>Valid</h2><h3>   </h3>";
    const result = extractHeadings(html);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid");
  });

  it("ignores H1, H4, H5, H6 headings", () => {
    const html = "<h1>Title</h1><h2>Valid</h2><h4>Ignored</h4><h5>Also ignored</h5>";
    const result = extractHeadings(html);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid");
  });
});

describe("addHeadingIds", () => {
  it("returns input unchanged for empty string", () => {
    expect(addHeadingIds("")).toBe("");
    expect(addHeadingIds(null as unknown as string)).toBe(null);
  });

  it("adds ID to headings without ID", () => {
    const html = "<h2>Title</h2>";
    const result = addHeadingIds(html);

    expect(result).toBe('<h2 id="toc-0">Title</h2>');
  });

  it("adds IDs to multiple headings", () => {
    const html = "<h2>First</h2><h3>Second</h3>";
    const result = addHeadingIds(html);

    expect(result).toBe('<h2 id="toc-0">First</h2><h3 id="toc-1">Second</h3>');
  });

  it("preserves existing IDs", () => {
    const html = '<h2 id="existing">Title</h2>';
    const result = addHeadingIds(html);

    expect(result).toBe('<h2 id="existing">Title</h2>');
  });

  it("handles mixed headings with and without IDs", () => {
    const html = '<h2 id="keep-me">First</h2><h3>Second</h3><h2>Third</h2>';
    const result = addHeadingIds(html);

    expect(result).toContain('id="keep-me"');
    expect(result).toContain('id="toc-0"'); // Second gets toc-0
    expect(result).toContain('id="toc-1"'); // Third gets toc-1
  });

  it("preserves other attributes when adding ID", () => {
    const html = '<h2 class="fancy">Title</h2>';
    const result = addHeadingIds(html);

    expect(result).toBe('<h2 class="fancy" id="toc-0">Title</h2>');
  });

  it("preserves content between headings", () => {
    const html = "<h2>Title</h2><p>Some paragraph</p><h3>Subtitle</h3>";
    const result = addHeadingIds(html);

    expect(result).toContain("<p>Some paragraph</p>");
  });
});

describe("processHeadings (cheerio-based)", () => {
  it("handles nested tags in headings", () => {
    const html = "<h2><code>function</code> getName</h2><h3>Sub <em>topic</em></h3>";
    const { html: result, items } = processHeadings(html);

    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("function getName");
    expect(items[1].text).toBe("Sub topic");
    expect(result).toContain(`id="${items[0].id}"`);
  });

  it("handles HTML entities in headings", () => {
    const html = "<h2>Test &amp; Deploy</h2><h3>A &lt; B</h3>";
    const { items } = processHeadings(html);

    expect(items[0].text).toBe("Test & Deploy");
    expect(items[1].text).toBe("A < B");
  });

  it("handles headings with newlines and whitespace", () => {
    const html = `
      <h2>
        Chapter 1
      </h2>
      <h3>Section   1.1</h3>
    `;
    const { items } = processHeadings(html);

    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("Chapter 1");
    expect(items[1].text).toBe("Section   1.1");
  });

  it("avoids duplicate IDs when existing ID conflicts with auto-generated", () => {
    const html = '<h2 id="toc-0">Already Has ID</h2><h2>Needs ID</h2>';
    const { html: result, items } = processHeadings(html);

    expect(items[0].id).toBe("toc-0");
    expect(items[1].id).toBe("toc-1");
    expect(result).toContain('id="toc-0"');
    expect(result).toContain('id="toc-1"');
  });

  it("generates unique IDs when toc-0 already exists", () => {
    const html = '<h2 id="toc-0">First</h2><h2 id="toc-1">Second</h2><h2>Third</h2>';
    const { items } = processHeadings(html);

    expect(items).toHaveLength(3);
    expect(items[0].id).toBe("toc-0");
    expect(items[1].id).toBe("toc-1");
    expect(items[2].id).toBe("toc-2");
  });

  it("preserves all heading attributes", () => {
    const html = '<h2 class="fancy" data-test="foo">Title</h2>';
    const { html: result } = processHeadings(html);

    expect(result).toContain('class="fancy"');
    expect(result).toContain('data-test="foo"');
    expect(result).toContain('id="toc-0"');
  });

  it("skips H1, H4, H5, H6", () => {
    const html = "<h1>Ignored</h1><h2>Valid</h2><h4>Also ignored</h4>";
    const { items } = processHeadings(html);

    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("Valid");
  });

  it("returns empty items for HTML without headings", () => {
    const html = "<p>No headings here</p><div>More content</div>";
    const { items } = processHeadings(html);

    expect(items).toEqual([]);
  });

  it("handles multiple calls without ID collision", () => {
    const html = "<h2>Title 1</h2><h3>Title 2</h3>";
    const first = processHeadings(html);
    const second = processHeadings(html);

    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(2);
    expect(first.items[0].id).toBe("toc-0");
    expect(second.items[0].id).toBe("toc-0");
  });

  it("synchronizes items and HTML IDs", () => {
    const html = '<h2>First</h2><h2 id="custom">Second</h2><h3>Third</h3>';
    const { html: result, items } = processHeadings(html);

    expect(items[0].id).toBe("toc-0");
    expect(items[1].id).toBe("custom");
    expect(items[2].id).toBe("toc-1");

    expect(result).toContain(`<h2 id="toc-0">`);
    expect(result).toContain(`id="custom"`);
    expect(result).toContain(`<h3 id="toc-1">`);
  });
});

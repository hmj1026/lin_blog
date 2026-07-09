import { describe, expect, it } from "vitest";

import { detectStrippedRichHtml } from "@/lib/utils/detect-rich-html";

describe("detectStrippedRichHtml", () => {
  it("returns true for content containing a <div> block", () => {
    expect(detectStrippedRichHtml("<div>content</div>")).toBe(true);
  });

  it("returns true for content containing a <section> block", () => {
    expect(detectStrippedRichHtml("<section>content</section>")).toBe(true);
  });

  it("returns true for content containing a <table> block", () => {
    expect(detectStrippedRichHtml("<table><tr><td>1</td></tr></table>")).toBe(true);
  });

  it("returns true when content has an inline style attribute", () => {
    expect(detectStrippedRichHtml('<p style="color:red">x</p>')).toBe(true);
  });

  it("returns true when content contains a <style> block", () => {
    expect(detectStrippedRichHtml("<p>x</p><style>.a{color:red}</style>")).toBe(true);
  });

  it("returns false for pure WYSIWYG content using only strict-allowlist tags", () => {
    expect(
      detectStrippedRichHtml("<h2>T</h2><p><strong>b</strong> <em>i</em></p><ul><li>a</li></ul>")
    ).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(detectStrippedRichHtml("")).toBe(false);
  });

  it("returns false for plain text", () => {
    expect(detectStrippedRichHtml("just some plain text")).toBe(false);
  });
});

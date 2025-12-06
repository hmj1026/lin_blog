import { describe, expect, it } from "vitest";
import { sanitizePostHtml } from "@/lib/utils/sanitize";

describe("sanitizePostHtml", () => {
  it("strips scripts and event handlers", () => {
    const html = `<p onclick="alert(1)">x</p><script>alert(1)</script>`;
    const out = sanitizePostHtml(html);
    expect(out).toMatch(/<p>/);
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it("keeps basic formatting and images", () => {
    const html = `<h2>Title</h2><p><strong>bold</strong> <em>italic</em></p><img src="/uploads/a.png" alt="a">`;
    const out = sanitizePostHtml(html);
    expect(out).toContain("<h2>");
    expect(out).toContain("<strong>");
    expect(out).toContain("<img");
    expect(out).toContain('src="/uploads/a.png"');
  });
});


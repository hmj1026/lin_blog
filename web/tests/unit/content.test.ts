import { describe, expect, it, vi } from "vitest";

vi.mock("@/env.public", () => ({
  publicEnv: { NEXT_PUBLIC_UPLOAD_BASE_URL: "https://cdn.example.com" },
}));

import { resolveUploadUrl, prepareRawHtmlContent } from "@/lib/utils/content";
import { prepareForRender } from "@/lib/content-pipeline";

describe("resolveUploadUrl", () => {
  it("keeps absolute urls", () => {
    expect(resolveUploadUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(resolveUploadUrl("data:image/png;base64,xxx")).toBe("data:image/png;base64,xxx");
  });

  it("prefixes base url for relative paths", () => {
    expect(resolveUploadUrl("uploads/a.png")).toBe("https://cdn.example.com/uploads/a.png");
    expect(resolveUploadUrl("/uploads/a.png")).toBe("https://cdn.example.com/uploads/a.png");
  });
});

describe("prepareForRender (mode=false, strict re-sanitization)", () => {
  it("removes script tags and event handlers", () => {
    const html = `<p onclick="alert(1)">x</p><script>alert(1)</script>`;
    const { html: out } = prepareForRender(html, false);
    expect(out).toMatch(/<p\b/i);
    expect(out).not.toMatch(/script/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it("removes <style> blocks and style attributes (strict allowlist)", () => {
    const html = `<style>.x{color:red}</style><p style="color:red" class="x">x</p>`;
    const { html: out } = prepareForRender(html, false);
    expect(out).not.toMatch(/<style/i);
    expect(out).not.toMatch(/style=/i);
    expect(out).not.toMatch(/class=/i);
    expect(out).toContain("x");
  });

  it("rewrites img src", () => {
    const html = `<p>t</p><img src="uploads/a.png" alt="a" />`;
    const { html: out } = prepareForRender(html, false);
    expect(out).toContain(`src="https://cdn.example.com/uploads/a.png"`);
  });

  it("adds IDs to headings without ID", () => {
    const html = `<h2>Introduction</h2><h3>Details</h3>`;
    const { html: out } = prepareForRender(html, false);
    expect(out).toContain('id="toc-0"');
    expect(out).toContain('id="toc-1"');
  });
});

describe("prepareRawHtmlContent", () => {
  it("preserves <style>, class and style attributes (no stripping)", () => {
    const { html } = prepareRawHtmlContent(
      `<h2>Intro</h2><div class="x" style="color:red"><style>.x{color:red}</style><p>body</p></div>`
    );
    expect(html).toContain('class="x"');
    expect(html).toMatch(/style="color/);
    expect(html).toContain("<style>");
    expect(html).not.toMatch(/<body>/i);
  });

  it("keeps a leading top-level <style> block that cheerio hoists into <head>", () => {
    const { html } = prepareRawHtmlContent(
      `<style>.raw-marker{color:rgb(255,0,0)}</style><p class="raw-marker">X</p><h2>A</h2><h2>B</h2>`
    );
    expect(html).toContain("<style>");
    expect(html).toMatch(/\.raw-marker\s*\{/);
    expect(html).toContain('class="raw-marker"');
  });

  it("preserves existing heading IDs", () => {
    const { html } = prepareRawHtmlContent(`<h2 id="custom">Title</h2>`);
    expect(html).toContain('id="custom"');
    expect(html).not.toContain('id="toc-');
  });

  it("adds heading IDs and returns tocItems", () => {
    const { html, tocItems } = prepareRawHtmlContent(`<h2>Intro</h2>`);
    expect(html).toContain('id="toc-0"');
    expect(tocItems).toHaveLength(1);
    expect(tocItems[0]?.text).toBe("Intro");
  });

  it("rewrites relative img src to the upload base URL", () => {
    const { html } = prepareRawHtmlContent(`<p>t</p><img src="uploads/a.png" alt="a" />`);
    expect(html).toContain(`src="https://cdn.example.com/uploads/a.png"`);
  });
});


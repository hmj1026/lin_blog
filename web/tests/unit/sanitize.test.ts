import { describe, expect, it } from "vitest";
import { sanitizePostHtml, sanitizeRawPostHtml, stripDangerousCss } from "@/lib/utils/sanitize";

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

describe("sanitizeRawPostHtml", () => {
  it("preserves class, style attributes and <style> blocks", () => {
    const html = `<div class="box" style="color: red"><style>.box{color:red}</style><p>hi</p></div>`;
    const out = sanitizeRawPostHtml(html);
    expect(out).toContain('class="box"');
    expect(out).toMatch(/style="color/);
    expect(out).toContain("<style>");
    expect(out).toMatch(/\.box\s*\{/);
  });

  it("still strips <script> and event handlers in raw mode", () => {
    const html = `<div onclick="alert(1)"><script>alert(1)</script><p>ok</p></div>`;
    const out = sanitizeRawPostHtml(html);
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/onclick/i);
    expect(out).toContain("<p>ok</p>");
  });

  it("strips dangerous CSS constructs from <style> blocks", () => {
    const html = `<style>.x{background:expression(alert(1));-moz-binding:url(x);behavior:url(x.htc)} @import url("evil.css");</style>`;
    const out = sanitizeRawPostHtml(html);
    expect(out).not.toMatch(/expression\s*\(/i);
    expect(out).not.toMatch(/-moz-binding/i);
    expect(out).not.toMatch(/behavior\s*:/i);
    expect(out).not.toMatch(/@import/i);
  });

  it("strips javascript: url() from style attributes", () => {
    const html = `<div style="background:url(javascript:alert(1))">x</div>`;
    const out = sanitizeRawPostHtml(html);
    expect(out).not.toMatch(/javascript:/i);
  });

  it("preserves scroll-behavior while stripping standalone behavior/-ms-behavior", () => {
    const html = `<div style="scroll-behavior:smooth; behavior:url(x.htc); -ms-behavior:url(y.htc)">x</div>`;
    const out = sanitizeRawPostHtml(html);
    expect(out).toMatch(/scroll-behavior\s*:\s*smooth/);
    expect(out).not.toMatch(/scroll-(?![a-z])/i);
    expect(out).not.toMatch(/[;{\s^]behavior\s*:/i);
    expect(out).not.toMatch(/-ms-behavior/i);
  });
});

describe("stripDangerousCss", () => {
  it("removes @import and expression", () => {
    expect(stripDangerousCss("@import url(x.css); a{color:red}")).not.toMatch(/@import/i);
    expect(stripDangerousCss("a{width:expression(1)}")).not.toMatch(/expression\s*\(/i);
  });

  it("preserves scroll-behavior while removing standalone behavior/-ms-behavior", () => {
    const out = stripDangerousCss("scroll-behavior:smooth;behavior:url(x.htc);-ms-behavior:url(y)");
    expect(out).toContain("scroll-behavior:smooth");
    expect(out).not.toMatch(/[;{\s^]behavior\s*:\s*url\(x\.htc\)/i);
    expect(out).not.toMatch(/-ms-behavior/i);
  });

  it("strips behavior immediately after a rule-closing brace", () => {
    // `}` must count as a property-name boundary, else a dangling
    // `behavior:` after a closed rule slips through (codex review).
    const out = stripDangerousCss("a{color:red}behavior:url(x.htc)");
    expect(out).toContain("a{color:red}");
    expect(out).not.toMatch(/behavior\s*:\s*url/i);
  });
});


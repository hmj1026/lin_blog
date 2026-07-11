import { describe, expect, it } from "vitest";
import {
  buildImageHtml,
  escapeHtmlAttribute,
  insertTextAtSelection,
  type UploadResult,
} from "@/lib/media/media-insert";

describe("escapeHtmlAttribute", () => {
  it("escapes &, <, >, \", ' to prevent attribute breakout", () => {
    const input = `a"<b>&'`;
    expect(escapeHtmlAttribute(input)).toBe("a&quot;&lt;b&gt;&amp;&#39;");
  });

  it("returns plain text unchanged when no special characters exist", () => {
    expect(escapeHtmlAttribute("plain alt text")).toBe("plain alt text");
  });
});

describe("buildImageHtml", () => {
  it("preserves the relative src verbatim (never rewritten to absolute)", () => {
    const result: UploadResult = { src: "/api/files/abc123" };
    const html = buildImageHtml(result, "photo");
    expect(html).toBe('<img src="/api/files/abc123" alt="photo" />');
  });

  it("escapes the alt attribute to prevent HTML injection via alt text", () => {
    const result: UploadResult = { src: "/api/files/xyz" };
    const html = buildImageHtml(result, `a"<b>&'`);
    expect(html).toBe('<img src="/api/files/xyz" alt="a&quot;&lt;b&gt;&amp;&#39;" />');
  });

  it("never emits an absolute URL even if given one verbatim (pass-through, no rewriting)", () => {
    const result: UploadResult = { src: "/api/files/relative-only" };
    const html = buildImageHtml(result, "alt");
    expect(html).not.toMatch(/https?:\/\//);
  });
});

describe("insertTextAtSelection", () => {
  it("inserts text at the start of the value (collapsed selection)", () => {
    const result = insertTextAtSelection("world", 0, 0, "hello ");
    expect(result).toEqual({ value: "hello world", cursor: 6 });
  });

  it("inserts text in the middle of the value (collapsed selection)", () => {
    const result = insertTextAtSelection("ac", 1, 1, "b");
    expect(result).toEqual({ value: "abc", cursor: 2 });
  });

  it("inserts text at the end of the value (collapsed selection)", () => {
    const result = insertTextAtSelection("hello", 5, 5, " world");
    expect(result).toEqual({ value: "hello world", cursor: 11 });
  });

  it("replaces a non-empty selection range with the inserted text", () => {
    const result = insertTextAtSelection("hello world", 6, 11, "there");
    expect(result).toEqual({ value: "hello there", cursor: 11 });
  });
});

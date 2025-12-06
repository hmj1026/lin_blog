import { describe, it, expect } from "vitest";
import { isReadablePost, normalizeSlug, parseSlug } from "@/modules/posts/domain";

describe("posts domain", () => {
  it("normalizeSlug() trims and lowercases", () => {
    expect(normalizeSlug("  Hello-World  ")).toBe("hello-world");
  });

  it("parseSlug() rejects invalid slugs", () => {
    expect(() => parseSlug("")).toThrow();
    expect(() => parseSlug("Hello World")).toThrow();
  });

  it("isReadablePost() hides non-published unless allowDraft", () => {
    expect(isReadablePost({ status: "DRAFT", deletedAt: null }, { allowDraft: false })).toBe(false);
    expect(isReadablePost({ status: "DRAFT", deletedAt: null }, { allowDraft: true })).toBe(true);
    expect(isReadablePost({ status: "PUBLISHED", deletedAt: null }, { allowDraft: false })).toBe(true);
    expect(isReadablePost({ status: "PUBLISHED", deletedAt: new Date() }, { allowDraft: true })).toBe(false);
  });
});


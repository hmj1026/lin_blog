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
    expect(isReadablePost({ status: "DRAFT", deletedAt: null, publishedAt: null }, { allowDraft: false })).toBe(false);
    expect(isReadablePost({ status: "DRAFT", deletedAt: null, publishedAt: null }, { allowDraft: true })).toBe(true);
    expect(isReadablePost({ status: "PUBLISHED", deletedAt: null, publishedAt: null }, { allowDraft: false })).toBe(true);
    expect(isReadablePost({ status: "PUBLISHED", deletedAt: new Date(), publishedAt: null }, { allowDraft: true })).toBe(false);
  });

  it("isReadablePost() hides PUBLISHED posts whose publishedAt is still in the future (public read)", () => {
    const now = new Date("2026-07-11T00:00:00Z");
    const future = new Date("2026-07-12T00:00:00Z");
    const past = new Date("2026-07-10T00:00:00Z");

    // 未到發佈時間：公開讀取不可見
    expect(isReadablePost({ status: "PUBLISHED", deletedAt: null, publishedAt: future }, { allowDraft: false, now })).toBe(false);
    // 已到發佈時間：可見
    expect(isReadablePost({ status: "PUBLISHED", deletedAt: null, publishedAt: past }, { allowDraft: false, now })).toBe(true);
    // publishedAt 為 null：視為即時公開，維持可見
    expect(isReadablePost({ status: "PUBLISHED", deletedAt: null, publishedAt: null }, { allowDraft: false, now })).toBe(true);
    // 預覽模式（allowDraft）忽略時間限制，讓後台可預覽未到時間的文章
    expect(isReadablePost({ status: "PUBLISHED", deletedAt: null, publishedAt: future }, { allowDraft: true, now })).toBe(true);
  });
});


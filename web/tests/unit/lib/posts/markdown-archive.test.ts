import { describe, it, expect } from "vitest";
import {
  serializePostToMarkdown,
  parseMarkdown,
  packZip,
  unpackZip,
  type ArchivePost,
} from "@/lib/posts/markdown-archive";

const sample: ArchivePost = {
  slug: "hello-world",
  title: 'A "quoted" title',
  excerpt: "An excerpt",
  content: '<h1 id="hero">Hi</h1>\n<p>body with --- dashes</p>',
  status: "PUBLISHED",
  featured: true,
  allowRawHtml: true,
  showRawHtmlToc: true,
  publishedAt: "2026-01-01T00:00:00.000Z",
  coverImage: null,
  readingTime: "3 min",
  seoTitle: "SEO",
  seoDescription: null,
  ogImage: null,
  categories: ["news", "tech"],
  tags: ["a"],
};

describe("markdown-archive", () => {
  it("round-trips a post through serialize -> parse, preserving both raw flags", () => {
    const md = serializePostToMarkdown(sample);
    const parsed = parseMarkdown(md);

    expect(parsed.slug).toBe(sample.slug);
    expect(parsed.title).toBe(sample.title);
    expect(parsed.excerpt).toBe(sample.excerpt);
    expect(parsed.content).toBe(sample.content);
    expect(parsed.status).toBe("PUBLISHED");
    expect(parsed.featured).toBe(true);
    // The two raw flags are the load-bearing assertion for the spec's round-trip contract.
    expect(parsed.allowRawHtml).toBe(true);
    expect(parsed.showRawHtmlToc).toBe(true);
    expect(parsed.publishedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(parsed.readingTime).toBe("3 min");
    expect(parsed.categories).toEqual(["news", "tech"]);
    expect(parsed.tags).toEqual(["a"]);
  });

  it("keeps the raw flags as real booleans (not strings) so strict import validation accepts them", () => {
    const parsed = parseMarkdown(serializePostToMarkdown({ ...sample, allowRawHtml: false, showRawHtmlToc: false }));
    expect(parsed.allowRawHtml).toBe(false);
    expect(parsed.showRawHtmlToc).toBe(false);
    expect(typeof parsed.allowRawHtml).toBe("boolean");
  });

  it("packs posts into a ZIP and unpacks them back (multi-post round-trip)", async () => {
    const posts: ArchivePost[] = [
      sample,
      { ...sample, slug: "second", title: "Second", allowRawHtml: false, showRawHtmlToc: false },
    ];
    const zip = await packZip(posts);
    expect(zip).toBeInstanceOf(ArrayBuffer);

    const unpacked = await unpackZip(zip);
    expect(unpacked).toHaveLength(2);
    const bySlug = Object.fromEntries(unpacked.map((p) => [p.slug, p]));
    expect(bySlug["hello-world"].allowRawHtml).toBe(true);
    expect(bySlug["second"].allowRawHtml).toBe(false);
    expect(bySlug["hello-world"].content).toBe(sample.content);
  });

  it("treats a leading '---' horizontal rule with no closing fence as content, not frontmatter", () => {
    // A hand-authored .md that opens with a Markdown HR then prose (no real frontmatter,
    // no closing fence) must not have its body silently swallowed as an open frontmatter block.
    const md = "---\n# 標題\n這是內文第一段。\n這是第二段。";
    const parsed = parseMarkdown(md);
    expect(parsed.content).toContain("# 標題");
    expect(parsed.content).toContain("這是內文第一段。");
    expect(parsed.content).toContain("這是第二段。");
    // No frontmatter fields were extractable, so required fields stay empty (import validation rejects).
    expect(parsed.slug).toBe("");
  });

  it("dedupes colliding slugs into distinct ZIP entries", async () => {
    const zip = await packZip([sample, { ...sample, title: "dup" }]);
    const unpacked = await unpackZip(zip);
    expect(unpacked).toHaveLength(2);
  });
});

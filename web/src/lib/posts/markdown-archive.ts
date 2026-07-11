import JSZip from "jszip";

/**
 * SSOT for the Markdown backup archive format (export + import).
 *
 * A post is serialized as a Markdown file with a JSON-valued frontmatter block
 * (`key: <JSON>`), so booleans round-trip as real booleans and strings/arrays
 * keep exact values. Multiple posts are packed as a ZIP of one `.md` file per
 * post — the canonical multi-post container required by the export/import spec.
 * A standalone `.md` is a single post.
 *
 * Pure/isomorphic: runs on the server (export route) and in the browser (import
 * client) unchanged.
 */
export interface ArchivePost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  status?: string;
  featured?: boolean;
  allowRawHtml?: boolean;
  showRawHtmlToc?: boolean;
  publishedAt?: string | null;
  coverImage?: string | null;
  readingTime?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImage?: string | null;
  categories?: string[];
  tags?: string[];
}

// Frontmatter keys, in stable output order. `content` is the Markdown body, not frontmatter.
const FRONTMATTER_KEYS: Array<keyof ArchivePost> = [
  "title",
  "slug",
  "excerpt",
  "status",
  "featured",
  "allowRawHtml",
  "showRawHtmlToc",
  "publishedAt",
  "coverImage",
  "readingTime",
  "seoTitle",
  "seoDescription",
  "ogImage",
  "categories",
  "tags",
];

const FENCE = "---";

/**
 * Serialize one post to a Markdown document: `---\n<frontmatter>\n---\n\n<content>`.
 * Null/undefined fields are omitted. Every value is JSON-encoded for lossless parsing.
 */
export function serializePostToMarkdown(post: ArchivePost): string {
  const lines = FRONTMATTER_KEYS.reduce<string[]>((acc, key) => {
    const value = post[key];
    if (value === undefined || value === null) return acc;
    return [...acc, `${key}: ${JSON.stringify(value)}`];
  }, []);

  return `${FENCE}\n${lines.join("\n")}\n${FENCE}\n\n${post.content ?? ""}`;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Parse one Markdown document (frontmatter + body) back into an ArchivePost.
 * Missing frontmatter yields a post whose content is the whole text (import
 * validation then rejects it for missing required fields).
 */
export function parseMarkdown(text: string): ArchivePost {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith(`${FENCE}\n`)) {
    return { slug: "", title: "", excerpt: "", content: normalized.trim() };
  }

  const lines = normalized.split("\n");
  const frontmatter: Record<string, unknown> = {};
  let cursor = 1; // skip the opening fence at lines[0]
  let closingFenceFound = false;
  for (; cursor < lines.length; cursor++) {
    if (lines[cursor] === FENCE) {
      cursor++;
      closingFenceFound = true;
      break;
    }
    const separator = lines[cursor].indexOf(": ");
    if (separator === -1) continue;
    const key = lines[cursor].slice(0, separator);
    frontmatter[key] = safeJsonParse(lines[cursor].slice(separator + 2));
  }

  // 沒有找到收尾 fence，代表這不是真的 frontmatter（例如手寫 .md 以 Markdown 水平線 `---` 開頭），
  // 不能把整份內容當成 frontmatter 吞掉；整份文字視為 content。
  if (!closingFenceFound) {
    return { slug: "", title: "", excerpt: "", content: normalized.trim() };
  }

  const content = lines.slice(cursor).join("\n").replace(/^\n+/, "").replace(/\s+$/, "");

  return {
    slug: typeof frontmatter.slug === "string" ? frontmatter.slug : "",
    title: typeof frontmatter.title === "string" ? frontmatter.title : "",
    excerpt: typeof frontmatter.excerpt === "string" ? frontmatter.excerpt : "",
    content,
    status: frontmatter.status as string | undefined,
    featured: frontmatter.featured as boolean | undefined,
    allowRawHtml: frontmatter.allowRawHtml as boolean | undefined,
    showRawHtmlToc: frontmatter.showRawHtmlToc as boolean | undefined,
    publishedAt: frontmatter.publishedAt as string | null | undefined,
    coverImage: frontmatter.coverImage as string | null | undefined,
    readingTime: frontmatter.readingTime as string | null | undefined,
    seoTitle: frontmatter.seoTitle as string | null | undefined,
    seoDescription: frontmatter.seoDescription as string | null | undefined,
    ogImage: frontmatter.ogImage as string | null | undefined,
    categories: Array.isArray(frontmatter.categories) ? (frontmatter.categories as string[]) : undefined,
    tags: Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : undefined,
  };
}

function uniqueFilename(slug: string, used: Set<string>): string {
  const base = (slug || "post").replace(/[^a-zA-Z0-9._-]/g, "-");
  let name = `${base}.md`;
  let n = 1;
  while (used.has(name)) {
    name = `${base}-${n}.md`;
    n++;
  }
  used.add(name);
  return name;
}

/** Pack posts into a ZIP (one `.md` per post). Returns an ArrayBuffer usable as a Response body or Blob. */
export async function packZip(posts: ArchivePost[]): Promise<ArrayBuffer> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const post of posts) {
    zip.file(uniqueFilename(post.slug, used), serializePostToMarkdown(post));
  }
  return zip.generateAsync({ type: "arraybuffer" });
}

/** Unpack a ZIP archive back into posts, parsing each `.md` entry. */
export async function unpackZip(data: ArrayBuffer | Uint8Array): Promise<ArchivePost[]> {
  const zip = await JSZip.loadAsync(data);
  const entries = Object.values(zip.files).filter((f) => !f.dir && f.name.endsWith(".md"));
  return Promise.all(entries.map(async (f) => parseMarkdown(await f.async("string"))));
}

const BLOCK_TAG_PATTERN =
  /<(div|section|article|header|footer|aside|main|nav|table|thead|tbody|tfoot|tr|td|th|caption|figure|figcaption|dl|dt|dd)[\s>/]/i;
const INLINE_STYLE_PATTERN = /\sstyle\s*=\s*["']/i;
const STYLE_BLOCK_PATTERN = /<style[\s>]/i;
// h1 and h4-h6 are NOT in the strict allowlist (only h2/h3 survive), so they are stripped.
const HEADING_PATTERN = /<h[1456][\s>/]/i;
// The strict allowlist sets allowedAttributes["*"] = [], so every id/class attribute is removed.
const ID_CLASS_PATTERN = /\s(?:id|class)\s*=\s*["']/i;

/**
 * SSOT detection for "content the strict WYSIWYG sanitizer would silently strip".
 *
 * Returns `true` when the given HTML string contains any construct that the
 * strict allowlist-based sanitizer removes without warning: inline `style`
 * attributes, `<style>` blocks, block-level structural tags (div, table,
 * section, etc.), headings outside the strict allowlist (`<h1>`, `<h4>`-`<h6>`),
 * or `id`/`class` attributes (the strict allowlist strips all attributes).
 * Pure content that only uses allowlisted inline/text tags with no id/class
 * (p, h2/h3, ul/ol/li, blockquote, pre, strong, em, a, img, code, ...) returns `false`.
 *
 * Pure function, no side effects.
 */
export function detectStrippedRichHtml(html: string): boolean {
  if (!html) return false;

  return (
    INLINE_STYLE_PATTERN.test(html) ||
    STYLE_BLOCK_PATTERN.test(html) ||
    BLOCK_TAG_PATTERN.test(html) ||
    HEADING_PATTERN.test(html) ||
    ID_CLASS_PATTERN.test(html)
  );
}

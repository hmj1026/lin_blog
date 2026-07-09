const BLOCK_TAG_PATTERN =
  /<(div|section|article|header|footer|aside|main|nav|table|thead|tbody|tfoot|tr|td|th|caption|figure|figcaption|dl|dt|dd)[\s>/]/i;
const INLINE_STYLE_PATTERN = /\sstyle\s*=\s*["']/i;
const STYLE_BLOCK_PATTERN = /<style[\s>]/i;

/**
 * SSOT detection for "content the strict WYSIWYG sanitizer would silently strip".
 *
 * Returns `true` when the given HTML string contains any construct that the
 * strict allowlist-based sanitizer removes without warning: inline `style`
 * attributes, `<style>` blocks, or block-level structural tags (div, table,
 * section, etc.) that are not part of the strict allowlist. Pure content
 * that only uses allowlisted inline/text tags (p, h1-h6, ul/ol/li,
 * blockquote, pre, strong, em, a, img, span, code, ...) returns `false`.
 *
 * Pure function, no side effects.
 */
export function detectStrippedRichHtml(html: string): boolean {
  if (!html) return false;

  return (
    INLINE_STYLE_PATTERN.test(html) ||
    STYLE_BLOCK_PATTERN.test(html) ||
    BLOCK_TAG_PATTERN.test(html)
  );
}

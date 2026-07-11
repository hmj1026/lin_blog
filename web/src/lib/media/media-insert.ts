/**
 * Mode-agnostic pure helpers for image upload result insertion.
 * Framework-free: no React/Next/Prisma imports. Shared SSOT for both
 * the TipTap (visual) and raw-HTML authoring modes.
 */

/** Result returned by the upload endpoint: a relative URL, never absolute. */
export type UploadResult = { src: string };

const HTML_ATTRIBUTE_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes characters that would break out of an HTML attribute value. */
export function escapeHtmlAttribute(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ATTRIBUTE_ESCAPES[char]);
}

/** Builds an `<img>` HTML fragment from an upload result and alt text. */
export function buildImageHtml(result: UploadResult, alt: string): string {
  return `<img src="${result.src}" alt="${escapeHtmlAttribute(alt)}" />`;
}

/**
 * Pure textarea selection-range insertion: replaces the [start, end) range
 * of `value` with `insert`, returning the new value and the cursor position
 * at the end of the inserted text.
 */
export function insertTextAtSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string
): { value: string; cursor: number } {
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const newValue = before + insert + after;
  return { value: newValue, cursor: before.length + insert.length };
}

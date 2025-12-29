import type { PostStatus } from "./post-status";

/**
 * 判斷文章是否可被閱讀
 *
 * @param input - 文章狀態資訊
 * @param params - 參數（是否允許閱讀草稿）
 * @returns 是否可閱讀
 *
 * @example
 * ```typescript
 * // 使用 Post class
 * const post = Post.fromData(data);
 * const canRead = post.canView(allowDraft);
 *
 * // 或使用此函式
 * const canRead = isReadablePost({ status: "PUBLISHED", deletedAt: null }, { allowDraft: false });
 * ```
 */
export function isReadablePost(
  input: { status: PostStatus; deletedAt: Date | null },
  params: { allowDraft: boolean }
): boolean {
  if (input.deletedAt) return false;
  if (input.status === "PUBLISHED") return true;
  if (params.allowDraft && input.status === "DRAFT") return true;
  return false;
}

/**
 * 判斷文章是否可被編輯
 */
export function isEditablePost(input: { deletedAt: Date | null }): boolean {
  return input.deletedAt === null;
}

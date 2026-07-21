import type { PostStatus } from "./post-status";

/**
 * 判斷文章是否可被閱讀
 *
 * @param input - 文章狀態資訊（含 `publishedAt`，用於排除尚未到發佈時間的文章）
 * @param params - 參數（是否允許閱讀草稿；可注入 `now` 以利測試）
 * @returns 是否可閱讀
 *
 * @remarks
 * 公開讀取（`allowDraft = false`）時，`PUBLISHED` 但 `publishedAt` 仍在未來的文章
 * 視為尚未公開，回傳 `false`，避免直接以「PUBLISHED + 未來時間」寫入的文章洩漏至
 * 公開頁面。`publishedAt` 為 `null` 時維持可讀（不因缺少時間而隱藏既有文章）。
 * 預覽模式（`allowDraft = true`）不套用此時間限制，讓後台可預覽尚未到時間的文章。
 *
 * @example
 * ```typescript
 * // 使用 Post class
 * const post = Post.fromData(data);
 * const canRead = post.canView(allowDraft);
 *
 * // 或使用此函式
 * const canRead = isReadablePost(
 *   { status: "PUBLISHED", deletedAt: null, publishedAt: new Date() },
 *   { allowDraft: false }
 * );
 * ```
 */
export function isReadablePost(
  input: { status: PostStatus; deletedAt: Date | null; publishedAt: Date | null },
  params: { allowDraft: boolean; now?: Date }
): boolean {
  if (input.deletedAt) return false;
  if (input.status === "PUBLISHED") {
    if (params.allowDraft) return true;
    const now = params.now ?? new Date();
    return !(input.publishedAt !== null && input.publishedAt > now);
  }
  if (params.allowDraft && input.status === "DRAFT") return true;
  return false;
}

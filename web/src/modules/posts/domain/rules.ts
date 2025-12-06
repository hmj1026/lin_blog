import type { PostStatus } from "./post-status";

export function isReadablePost(input: { status: PostStatus; deletedAt: Date | null }, params: { allowDraft: boolean }) {
  if (input.deletedAt) return false;
  if (input.status !== "PUBLISHED" && !params.allowDraft) return false;
  return true;
}

export const POST_STATUSES = ["DRAFT", "PUBLISHED", "SCHEDULED"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export function isPostStatus(value: string): value is PostStatus {
  return (POST_STATUSES as readonly string[]).includes(value);
}

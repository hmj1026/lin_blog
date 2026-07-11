/**
 * Prisma `Subscriber` row 與 application 層型別之間的映射。
 * 集中於此，避免 Prisma 型別越過 infrastructure 邊界。
 */
import type { SubscriberRecord } from "../../application/ports";

/** Prisma `subscriber.create`/`findUnique` 使用的最小欄位 select，供 write repository 使用 */
export const subscriberRecordSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
} as const;

type SubscriberRow = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export function toSubscriberRecord(row: SubscriberRow): SubscriberRecord {
  return { id: row.id, name: row.name, email: row.email, createdAt: row.createdAt };
}

import type { PostStatus } from "../../domain";
import type { PostStatus as PrismaPostStatus } from "@prisma/client";

export function mapPostStatusFromPrisma(status: string): PostStatus {
  if (status === "DRAFT" || status === "PUBLISHED" || status === "SCHEDULED") return status;
  throw new Error(`Unknown PostStatus: ${status}`);
}

export function mapPostStatusToPrisma(status: PostStatus): PrismaPostStatus {
  return status;
}

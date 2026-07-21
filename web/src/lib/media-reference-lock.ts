import type { Prisma } from "@prisma/client";
import { ApiException } from "@/lib/errors";

/**
 * Postgres SSI（Serializable Snapshot Isolation）僅約束「雙方皆 Serializable」的交易；
 * 媒體引用寫入方（文章／站點設定）走預設隔離層級，不受 SSI 保護，
 * 故需以 advisory lock 讓「刪除方」與「引用寫入方」互斥，關閉競態視窗。
 */

/** 媒體引用鎖的 advisory lock 命名空間常數（全庫唯一即可，勿與其他 advisory lock 撞號）。 */
export const MEDIA_REFERENCE_LOCK_KEY = 815_001;

/** 媒體刪除方：取得排他 advisory lock（交易結束自動釋放）。 */
export async function lockMediaReferencesExclusive(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${MEDIA_REFERENCE_LOCK_KEY})`;
}

/** 引用寫入方（文章／站點設定）：取得共享 advisory lock，與刪除方互斥、寫入方彼此不互斥。 */
export async function lockMediaReferencesShared(tx: Prisma.TransactionClient): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(${MEDIA_REFERENCE_LOCK_KEY})`;
}

/** 寫入內容引用了已被軟刪除媒體時拋出；handleApiError 映射為 409。 */
export class DeletedMediaReferenceError extends ApiException {
  readonly uploadIds: string[];
  constructor(uploadIds: string[]) {
    super(`內容引用的媒體已被刪除（${uploadIds.join("、")}），請移除或替換後再儲存`, 409);
    this.uploadIds = uploadIds;
  }
}

/** 從欄位值中萃取 /api/files/<uploadId> 形式的媒體引用 ID（去重）。 */
export function extractReferencedUploadIds(values: Array<string | null | undefined>): string[] {
  const ids = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    for (const match of value.matchAll(/\/api\/files\/([A-Za-z0-9_-]+)/g)) {
      ids.add(match[1]);
    }
  }
  return [...ids];
}

/**
 * 共享鎖後的存活重驗：advisory lock 只能讓刪除方與寫入方互斥排序，
 * 若刪除交易先提交，後續寫入仍會成功寫入指向已刪媒體的引用（URL 隨即 404）。
 * 故寫入方取得共享鎖後，須在同一交易內重驗所引用的 Upload 皆未被軟刪除。
 */
export async function assertReferencedMediaUsable(
  tx: Prisma.TransactionClient,
  values: Array<string | null | undefined>
): Promise<void> {
  const ids = extractReferencedUploadIds(values);
  if (ids.length === 0) return;
  const deleted = await tx.upload.findMany({
    where: { id: { in: ids }, deletedAt: { not: null } },
    select: { id: true },
  });
  if (deleted.length > 0) throw new DeletedMediaReferenceError(deleted.map((u) => u.id));
}

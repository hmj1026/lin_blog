import type { Prisma } from "@prisma/client";

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

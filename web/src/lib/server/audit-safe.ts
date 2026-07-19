import "server-only";

import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { auditUseCases } from "@/modules/audit";

type SafeAuditInput = {
  action: string;
  resourceType: string;
  resourceId: string;
  summary?: unknown;
};

/**
 * 在主要 mutation 成功後盡力寫入 audit event。
 * 失敗只留下固定的非敏感維運 metadata，絕不把摘要或原始例外寫入 log。
 */
export async function recordAuditEventSafely(input: SafeAuditInput): Promise<boolean> {
  try {
    const session = await getSession();
    if (!session?.user?.id) throw new Error("missing-audit-actor");
    await auditUseCases.recordAuditEvent({ ...input, actorId: session.user.id });
  } catch {
    logger.error("Audit event write failed", {
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });
    return false;
  }

  try {
    await auditUseCases.purgeExpiredAuditEvents();
  } catch {
    logger.warn("Audit retention cleanup failed", { retentionDays: 365 });
  }
  return true;
}

import { sanitizeAuditSummary } from "../domain/audit-summary";
import type { AuditRepository } from "./ports";

export const AUDIT_RETENTION_DAYS = 365;

/** 建立 audit 寫入與 365 天資料保存政策的應用層操作。 */
export function createAuditUseCases({ repo }: { repo: AuditRepository }) {
  return {
    /** 寫入前只保留經過白名單縮減的非敏感摘要。 */
    recordAuditEvent: (input: {
      actorId: string;
      action: string;
      resourceType: string;
      resourceId: string;
      summary?: unknown;
    }) => repo.create({ ...input, summary: sanitizeAuditSummary(input.summary) }),

    /** 清除保存期限之前的 audit events。 */
    purgeExpiredAuditEvents: (now = new Date()) => {
      const cutoff = new Date(now);
      cutoff.setUTCDate(cutoff.getUTCDate() - AUDIT_RETENTION_DAYS);
      return repo.deleteBefore(cutoff);
    },

    /** 以 365 天保存邊界提供有界的活動紀錄分頁。 */
    listAuditEvents: async (input: {
      page?: number;
      pageSize?: number;
      since?: Date;
      until?: Date;
      actor?: string;
      resource?: string;
    }, now = new Date()) => {
      const page = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? input.page! : 1;
      const pageSize = Number.isInteger(input.pageSize) && (input.pageSize ?? 0) > 0
        ? Math.min(input.pageSize!, 100)
        : 20;
      const retentionSince = new Date(now);
      retentionSince.setUTCDate(retentionSince.getUTCDate() - AUDIT_RETENTION_DAYS);
      const since = input.since && input.since > retentionSince ? input.since : retentionSince;
      const result = await repo.listPage({
        since,
        until: input.until,
        actor: input.actor?.trim() || undefined,
        resource: input.resource?.trim() || undefined,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      return {
        ...result,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
      };
    },
  };
}

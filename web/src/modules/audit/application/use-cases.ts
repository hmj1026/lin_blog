import { sanitizeAuditSummary } from "../domain/audit-summary";
import type { AuditRepository } from "./ports";

export const AUDIT_RETENTION_DAYS = 365;
// 分頁上界：避免任意大的 page 造成巨大 OFFSET、資料庫成本或超出整數範圍。
// 保留期 365 天內的高風險事件遠低於此上界，實務不會受限。
export const MAX_AUDIT_PAGE = 100_000;

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
      const requestedPage = Number.isInteger(input.page) && (input.page ?? 0) > 0 ? input.page! : 1;
      const page = Math.min(requestedPage, MAX_AUDIT_PAGE);
      const pageSize = Number.isInteger(input.pageSize) && (input.pageSize ?? 0) > 0
        ? Math.min(input.pageSize!, 100)
        : 20;
      const retentionSince = new Date(now);
      retentionSince.setUTCDate(retentionSince.getUTCDate() - AUDIT_RETENTION_DAYS);
      const since = input.since && input.since > retentionSince ? input.since : retentionSince;
      const listFilters = {
        since,
        until: input.until,
        actor: input.actor?.trim() || undefined,
        resource: input.resource?.trim() || undefined,
      };
      let result = await repo.listPage({ ...listFilters, skip: (page - 1) * pageSize, take: pageSize });
      const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
      // 請求頁碼可能超過刪除保存期限縮減後的總頁數，此時以實際最後一頁重查，
      // 避免回傳空列表且分頁元件無法導回（同 posts.listForAdmin 的處理）。
      let effectivePage = page;
      if (result.items.length === 0 && result.total > 0 && page > totalPages) {
        effectivePage = totalPages;
        result = await repo.listPage({ ...listFilters, skip: (effectivePage - 1) * pageSize, take: pageSize });
      }
      return {
        ...result,
        page: effectivePage,
        pageSize,
        totalPages,
      };
    },
  };
}

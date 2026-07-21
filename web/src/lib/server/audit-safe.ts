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
 * 從 partial payload 取出實際變更的欄位名（僅欄位名，非值），供稽核摘要使用。
 * 非物件（陣列／字串等異常輸入）回傳空陣列；欄位名是否可記錄由 audit 白名單把關。
 */
export function changedFieldNames(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.keys(payload as Record<string, unknown>);
}

/**
 * 在主要 mutation 成功後盡力寫入 audit event。
 * 失敗只留下固定的非敏感維運 metadata，絕不把摘要或原始例外寫入 log。
 *
 * 註：保留期限清理已與此寫入路徑解耦，改由排程（cron）獨立執行，
 * 避免「長期無高風險 mutation」或「事件寫入持續失敗」時保留政策失效、資料表無限成長。
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

  return true;
}

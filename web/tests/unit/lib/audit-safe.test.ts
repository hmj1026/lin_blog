import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { auditUseCases } from "@/modules/audit";
import { recordAuditEventSafely } from "@/lib/server/audit-safe";

vi.mock("@/lib/auth", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("@/modules/audit", () => ({ auditUseCases: { recordAuditEvent: vi.fn(), purgeExpiredAuditEvents: vi.fn() } }));

describe("recordAuditEventSafely", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ user: { id: "actor-1" } } as never);
    vi.mocked(auditUseCases.recordAuditEvent).mockResolvedValue({ id: "event-1" });
    vi.mocked(auditUseCases.purgeExpiredAuditEvents).mockResolvedValue(0);
  });

  it("使用目前 session actor 寫入並在成功後清理過期事件", async () => {
    await expect(recordAuditEventSafely({ action: "role.updated", resourceType: "role", resourceId: "role-1", summary: { changedFields: ["permissions"] } })).resolves.toBe(true);
    expect(auditUseCases.recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ actorId: "actor-1" }));
    expect(auditUseCases.purgeExpiredAuditEvents).toHaveBeenCalled();
  });

  it("寫入失敗不拋錯，維運紀錄不包含摘要、例外訊息或 stack", async () => {
    vi.mocked(auditUseCases.recordAuditEvent).mockRejectedValue(new Error("password=secret-token"));
    const result = await recordAuditEventSafely({ action: "user.updated", resourceType: "user", resourceId: "user-1", summary: { password: "secret", token: "secret-token" } });
    expect(result).toBe(false);
    const logged = JSON.stringify(vi.mocked(logger.error).mock.calls);
    expect(logged).toContain("user.updated");
    expect(logged).not.toContain("secret");
    expect(logged).not.toContain("password");
    expect(logged).not.toContain("stack");
  });
});

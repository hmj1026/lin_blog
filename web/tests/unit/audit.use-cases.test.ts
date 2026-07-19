import { describe, expect, it, vi } from "vitest";
import { createAuditUseCases } from "@/modules/audit/application/use-cases";

describe("audit use cases", () => {
  it("寫入前將摘要縮減為非敏感白名單", async () => {
    const repo = { create: vi.fn().mockResolvedValue({ id: "event-1" }), deleteBefore: vi.fn(), listPage: vi.fn() };
    const useCases = createAuditUseCases({ repo: repo as never });
    await useCases.recordAuditEvent({ actorId: "actor-1", action: "user.role_changed", resourceType: "user", resourceId: "user-1", summary: { fromRoleId: "editor", toRoleId: "admin", password: "secret" } });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ summary: { fromRoleId: "editor", toRoleId: "admin" } }));
  });

  it("依 365 天保存期限清除過期事件", async () => {
    const repo = { create: vi.fn(), deleteBefore: vi.fn().mockResolvedValue(4), listPage: vi.fn() };
    const useCases = createAuditUseCases({ repo: repo as never });
    const now = new Date("2026-07-19T00:00:00.000Z");
    await expect(useCases.purgeExpiredAuditEvents(now)).resolves.toBe(4);
    expect(repo.deleteBefore).toHaveBeenCalledWith(new Date("2025-07-19T00:00:00.000Z"));
  });

  it("將非法分頁 clamp 並強制 365 天查詢下限", async () => {
    const repo = { create: vi.fn(), deleteBefore: vi.fn(), listPage: vi.fn().mockResolvedValue({ total: 0, items: [] }) };
    const useCases = createAuditUseCases({ repo: repo as never });
    await useCases.listAuditEvents({ page: -2, pageSize: 999, actor: " actor ", resource: " role " }, new Date("2026-07-19T00:00:00.000Z"));
    expect(repo.listPage).toHaveBeenCalledWith({ since: new Date("2025-07-19T00:00:00.000Z"), until: undefined, actor: "actor", resource: "role", skip: 0, take: 100 });
  });
});

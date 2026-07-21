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

  it("將過大的 page clamp 至上界，避免巨大 OFFSET 或整數溢位", async () => {
    const repo = { create: vi.fn(), deleteBefore: vi.fn(), listPage: vi.fn().mockResolvedValue({ total: 0, items: [] }) };
    const useCases = createAuditUseCases({ repo: repo as never });
    const result = await useCases.listAuditEvents({ page: 1_000_000_000, pageSize: 20 }, new Date("2026-07-19T00:00:00.000Z"));
    // page 被 clamp 到 100000，skip = (100000 - 1) * 20 = 1999980（有界），而非 ~2e10。
    expect(result.page).toBe(100_000);
    expect(repo.listPage).toHaveBeenCalledWith(expect.objectContaining({ skip: 1_999_980, take: 20 }));
  });

  it("請求頁碼超過保存期限內縮減的總頁數時，以實際最後一頁重查而非回傳空列表", async () => {
    const event = { id: "e1", actorId: "a1", action: "post.published", resourceType: "post", resourceId: "p1", summary: {}, createdAt: new Date() };
    const repo = {
      create: vi.fn(),
      deleteBefore: vi.fn(),
      listPage: vi.fn()
        .mockResolvedValueOnce({ total: 1, items: [] })
        .mockResolvedValueOnce({ total: 1, items: [event] }),
    };
    const useCases = createAuditUseCases({ repo: repo as never });
    const result = await useCases.listAuditEvents({ page: 3, pageSize: 20 }, new Date("2026-07-19T00:00:00.000Z"));
    expect(repo.listPage).toHaveBeenNthCalledWith(2, expect.objectContaining({ skip: 0, take: 20 }));
    expect(result).toEqual({ total: 1, items: [event], page: 1, pageSize: 20, totalPages: 1 });
  });
});

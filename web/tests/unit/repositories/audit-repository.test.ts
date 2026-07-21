import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({ prisma: { auditEvent: { create: vi.fn(), deleteMany: vi.fn(), count: vi.fn(), findMany: vi.fn() } } }));

import { auditRepositoryPrisma } from "@/modules/audit/infrastructure/prisma/audit.repository.prisma";

describe("auditRepositoryPrisma", () => {
  beforeEach(() => vi.clearAllMocks());

  it("建立具 actor、action、resource 與摘要的事件", async () => {
    vi.mocked(prisma.auditEvent.create).mockResolvedValue({ id: "event-1" } as never);
    const input = { actorId: "actor-1", action: "role.updated", resourceType: "role", resourceId: "role-1", summary: { changedFields: ["permissions"] } };
    await auditRepositoryPrisma.create(input);
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({ data: input });
  });

  it("刪除 cutoff 之前的事件並回傳筆數", async () => {
    vi.mocked(prisma.auditEvent.deleteMany).mockResolvedValue({ count: 3 });
    const cutoff = new Date("2025-07-19T00:00:00.000Z");
    await expect(auditRepositoryPrisma.deleteBefore(cutoff)).resolves.toBe(3);
    expect(prisma.auditEvent.deleteMany).toHaveBeenCalledWith({ where: { createdAt: { lt: cutoff } } });
  });

  it("以日期、actor、resource 做有界分頁查詢", async () => {
    vi.mocked(prisma.auditEvent.count).mockResolvedValue(1);
    vi.mocked(prisma.auditEvent.findMany).mockResolvedValue([{ id: "event-1" }] as never);
    const since = new Date("2025-07-19T00:00:00.000Z");
    const until = new Date("2026-07-19T23:59:59.999Z");
    const result = await auditRepositoryPrisma.listPage({ since, until, actor: "actor-1", resource: "role-1", skip: 20, take: 20 });
    expect(result).toEqual({ total: 1, items: [{ id: "event-1" }] });
    expect(prisma.auditEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { createdAt: { gte: since, lte: until }, actorId: { contains: "actor-1", mode: "insensitive" }, OR: [{ resourceType: { contains: "role-1", mode: "insensitive" } }, { resourceId: { contains: "role-1", mode: "insensitive" } }] },
      skip: 20,
      take: 20,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }));
  });
});

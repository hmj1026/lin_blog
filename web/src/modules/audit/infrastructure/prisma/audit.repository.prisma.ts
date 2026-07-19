import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AuditRepository } from "../../application/ports";
import type { AuditSummary } from "../../domain/audit-summary";

/** Prisma audit repository，僅持久化 application layer 已縮減的摘要。 */
export const auditRepositoryPrisma: AuditRepository = {
  create: (input) => prisma.auditEvent.create({
    data: { ...input, summary: input.summary as Prisma.InputJsonValue },
  }),
  async deleteBefore(cutoff) {
    const result = await prisma.auditEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return result.count;
  },
  async listPage(input) {
    const where: Prisma.AuditEventWhereInput = {
      createdAt: { gte: input.since, lte: input.until },
      ...(input.actor ? { actorId: { contains: input.actor, mode: "insensitive" } } : {}),
      ...(input.resource ? { OR: [
        { resourceType: { contains: input.resource, mode: "insensitive" } },
        { resourceId: { contains: input.resource, mode: "insensitive" } },
      ] } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({ where, skip: input.skip, take: input.take, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    ]);
    return {
      total,
      items: rows.map((row) => ({ ...row, summary: row.summary as AuditSummary })),
    };
  },
};

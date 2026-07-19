import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";
import { subscriberListRepositoryPrisma } from "@/modules/newsletter/infrastructure/prisma/subscriber-list.repository.prisma";

/**
 * `SubscriberListRepository` 的 Prisma 實作整合測試（task 4.6）。
 */
describe("subscriberListRepositoryPrisma.list", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await truncateAll(prisma);
  });

  it("matches by name case-insensitively (contains)", async () => {
    await prisma.subscriber.create({ data: { name: "Alice Reader", email: "alice@example.com" } });
    await prisma.subscriber.create({ data: { name: "Bob Fan", email: "bob@example.com" } });

    const result = await subscriberListRepositoryPrisma.list({ search: "alice", page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe("Alice Reader");
  });

  it("matches by email case-insensitively (contains)", async () => {
    await prisma.subscriber.create({ data: { name: "Alice Reader", email: "alice@example.com" } });
    await prisma.subscriber.create({ data: { name: "Bob Fan", email: "bob@example.com" } });

    const result = await subscriberListRepositoryPrisma.list({ search: "BOB@EXAMPLE", page: 1, pageSize: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0].email).toBe("bob@example.com");
  });

  it("returns bounded pagination results using page/pageSize", async () => {
    for (let i = 0; i < 5; i++) {
      await prisma.subscriber.create({
        data: { name: `Reader ${i}`, email: `reader${i}@example.com` },
      });
    }

    const page1 = await subscriberListRepositoryPrisma.list({ page: 1, pageSize: 2 });
    const page2 = await subscriberListRepositoryPrisma.list({ page: 2, pageSize: 2 });
    const page3 = await subscriberListRepositoryPrisma.list({ page: 3, pageSize: 2 });

    expect(page1.total).toBe(5);
    expect(page1.items).toHaveLength(2);
    expect(page2.items).toHaveLength(2);
    expect(page3.items).toHaveLength(1);
  });

  it("returns the total count independent of pagination window", async () => {
    for (let i = 0; i < 3; i++) {
      await prisma.subscriber.create({
        data: { name: `Reader ${i}`, email: `total${i}@example.com` },
      });
    }

    const result = await subscriberListRepositoryPrisma.list({ page: 1, pageSize: 1 });

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(1);
  });

  it("orders by createdAt DESC with id as a stable tiebreak", async () => {
    // Identical createdAt to prove the id tiebreak, not natural insertion order alone.
    const tiedCreatedAt = new Date("2026-01-01T00:00:00.000Z");
    const older = await prisma.subscriber.create({
      data: { name: "Older", email: "older@example.com", createdAt: tiedCreatedAt },
    });
    const tiedA = await prisma.subscriber.create({
      data: { name: "Tied A", email: "tied-a@example.com", createdAt: tiedCreatedAt },
    });
    const tiedB = await prisma.subscriber.create({
      data: { name: "Tied B", email: "tied-b@example.com", createdAt: tiedCreatedAt },
    });

    const result = await subscriberListRepositoryPrisma.list({ page: 1, pageSize: 10 });

    const tiedIds = [tiedA.id, tiedB.id].sort().reverse(); // id DESC tiebreak
    const resultIds = result.items.map((i) => i.id);

    expect(resultIds).toEqual([...tiedIds, older.id]);

    // Re-run to confirm the ordering is stable across repeated calls.
    const again = await subscriberListRepositoryPrisma.list({ page: 1, pageSize: 10 });
    expect(again.items.map((i) => i.id)).toEqual(resultIds);
  });

  it("selects only id, name, email, createdAt (no other fields leak)", async () => {
    await prisma.subscriber.create({ data: { name: "Reader", email: "select-only@example.com" } });

    const result = await subscriberListRepositoryPrisma.list({ page: 1, pageSize: 10 });

    expect(result.items).toHaveLength(1);
    expect(Object.keys(result.items[0]).sort()).toEqual(["createdAt", "email", "id", "name"]);
    expect(result.items[0]).not.toHaveProperty("updatedAt");
  });

  it("以 aggregate count 計算近 7 與 30 天成長", async () => {
    const now = new Date("2026-07-19T00:00:00.000Z");
    await prisma.subscriber.createMany({ data: [
      { name: "Recent", email: "recent@example.com", createdAt: new Date("2026-07-18T00:00:00.000Z") },
      { name: "Month", email: "month@example.com", createdAt: new Date("2026-07-01T00:00:00.000Z") },
      { name: "Old", email: "old@example.com", createdAt: new Date("2026-05-01T00:00:00.000Z") },
    ] });

    await expect(subscriberListRepositoryPrisma.countGrowth!({
      since7Days: new Date(now.getTime() - 7 * 86_400_000),
      since30Days: new Date(now.getTime() - 30 * 86_400_000),
    })).resolves.toEqual({ last7Days: 1, last30Days: 2 });
  });
});

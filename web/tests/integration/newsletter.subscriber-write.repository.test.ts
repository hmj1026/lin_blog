import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";
import { subscriberWriteRepositoryPrisma } from "@/modules/newsletter/infrastructure/prisma/subscriber-write.repository.prisma";

/**
 * `SubscriberWriteRepository` 的 Prisma 實作整合測試（task 4.4）。
 *
 * 呼叫端（use-case）先做 Email 正規化再傳入，故這裡一律傳入已正規化
 * （trim + 小寫）的 Email 字串，不測試/實作 adapter 內的重複正規化。
 */
describe("subscriberWriteRepositoryPrisma", () => {
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

  describe("create", () => {
    it("persists a new subscriber with the given normalized email", async () => {
      const result = await subscriberWriteRepositoryPrisma.create({
        name: "Reader One",
        email: "reader@example.com",
      });

      expect(result.outcome).toBe("created");
      if (result.outcome !== "created") throw new Error("expected created");
      expect(result.subscriber.name).toBe("Reader One");
      expect(result.subscriber.email).toBe("reader@example.com");
      expect(result.subscriber.id).toEqual(expect.any(String));
      expect(result.subscriber.createdAt).toBeInstanceOf(Date);

      const row = await prisma.subscriber.findUnique({ where: { email: "reader@example.com" } });
      expect(row?.name).toBe("Reader One");
    });

    it("maps a duplicate normalized email to the typed conflict outcome instead of throwing", async () => {
      await subscriberWriteRepositoryPrisma.create({ name: "Reader One", email: "dup@example.com" });

      const result = await subscriberWriteRepositoryPrisma.create({
        name: "Reader Two",
        email: "dup@example.com",
      });

      expect(result).toEqual({ outcome: "conflict" });
    });

    it("never overwrites the existing subscriber's name on a duplicate email", async () => {
      await subscriberWriteRepositoryPrisma.create({ name: "Original Name", email: "keep-name@example.com" });

      await subscriberWriteRepositoryPrisma.create({ name: "Attempted Overwrite", email: "keep-name@example.com" });

      const row = await prisma.subscriber.findUnique({ where: { email: "keep-name@example.com" } });
      expect(row?.name).toBe("Original Name");

      const count = await prisma.subscriber.count({ where: { email: "keep-name@example.com" } });
      expect(count).toBe(1);
    });

    it("propagates unexpected database errors instead of swallowing them", async () => {
      // Force a non-unique-constraint failure (Prisma client-side validation
      // error, not P2002) by passing a value of the wrong type. The port has
      // no generic error outcome, so this SHALL reject rather than be mapped
      // to `{ outcome: "conflict" }` or swallowed.
      await expect(
        subscriberWriteRepositoryPrisma.create({
          name: "Reader",
          email: 12345 as unknown as string,
        })
      ).rejects.toThrow();
    });
  });

  describe("findByEmail", () => {
    it("finds an existing subscriber by normalized email", async () => {
      await subscriberWriteRepositoryPrisma.create({ name: "Reader One", email: "findme@example.com" });

      const found = await subscriberWriteRepositoryPrisma.findByEmail("findme@example.com");

      expect(found).not.toBeNull();
      expect(found?.name).toBe("Reader One");
      expect(found?.email).toBe("findme@example.com");
    });

    it("returns null when no subscriber matches the normalized email", async () => {
      const found = await subscriberWriteRepositoryPrisma.findByEmail("nobody@example.com");
      expect(found).toBeNull();
    });
  });
});

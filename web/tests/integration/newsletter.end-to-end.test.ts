import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createTestPrismaClient, truncateAll } from "./helpers/db";
import { createNewsletterUseCases } from "@/modules/newsletter/application/use-cases";
import { subscriberWriteRepositoryPrisma } from "@/modules/newsletter/infrastructure/prisma/subscriber-write.repository.prisma";
import { subscriberListRepositoryPrisma } from "@/modules/newsletter/infrastructure/prisma/subscriber-list.repository.prisma";
import { createInMemoryNewsletterRateLimiter } from "@/modules/newsletter/infrastructure/rate-limit/in-memory-rate-limiter";
import type { CaptchaVerifier } from "@/modules/newsletter/application/ports";

/**
 * Task 9.2 — newsletter 端到端整合測試。
 *
 * 組裝與 `newsletterUseCases`（`src/modules/newsletter/index.ts`）相同的真實
 * Prisma write/list repository，但改用測試專用的 fake `CaptchaVerifier`
 * （spy，可控成功/失敗）取代會打外部網路的 reCAPTCHA adapter，並使用真實
 * `createInMemoryNewsletterRateLimiter`（小視窗設定）驗證限流短路行為。
 *
 * fixture email 一律使用 `@newsletter-e2e.test` 網域作為本檔案專用標記，
 * 每個限流相關測試使用獨立的 `sourceKey`，避免同一檔案內（`fileParallelism:
 * false` 序列執行）多個 `it()` 之間彼此耗用限流額度而互相污染。
 */
describe("newsletter end-to-end (real Prisma stack)", () => {
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

  function createFakeCaptchaVerifier(ok = true) {
    return {
      verify: vi.fn(async () =>
        ok ? { ok: true as const } : { ok: false as const, reason: "provider-error" as const }
      ),
    };
  }

  function buildUseCases(params: {
    captchaVerifier?: CaptchaVerifier;
    maxRequests?: number;
    windowSeconds?: number;
  } = {}) {
    const captchaVerifier = params.captchaVerifier ?? createFakeCaptchaVerifier(true);
    const rateLimiter = createInMemoryNewsletterRateLimiter({
      windowSeconds: params.windowSeconds ?? 60,
      // Generous by default so tests unrelated to rate limiting are not
      // accidentally short-circuited by a shared-file sourceKey collision.
      maxRequests: params.maxRequests ?? 100,
    });

    return {
      useCases: createNewsletterUseCases({
        writeRepo: subscriberWriteRepositoryPrisma,
        listRepo: subscriberListRepositoryPrisma,
        captchaVerifier,
        rateLimiter,
      }),
      captchaVerifier,
    };
  }

  describe("subscribe", () => {
    it("persists a new subscription with trimmed name and normalized (lowercased) email", async () => {
      const { useCases } = buildUseCases();

      const result = await useCases.subscribe({
        name: "  Reader One  ",
        email: "  READER.ONE@Newsletter-E2E.test  ",
        captchaToken: "token",
        sourceKey: "e2e-source-persist",
      });

      expect(result).toEqual({ status: "subscribed" });

      const row = await prisma.subscriber.findUnique({ where: { email: "reader.one@newsletter-e2e.test" } });
      expect(row).not.toBeNull();
      expect(row?.name).toBe("Reader One");
    });

    it("is idempotent for a duplicate email, including a case/whitespace variant, leaving exactly one row with identical generic success", async () => {
      const { useCases } = buildUseCases();
      const email = "dup@newsletter-e2e.test";

      const first = await useCases.subscribe({
        name: "First Name",
        email,
        captchaToken: "token",
        sourceKey: "e2e-source-dup",
      });
      const second = await useCases.subscribe({
        name: "Second Name",
        email: "  Dup@Newsletter-E2E.test  ",
        captchaToken: "token",
        sourceKey: "e2e-source-dup",
      });

      expect(first).toEqual({ status: "subscribed" });
      expect(second).toEqual({ status: "subscribed" });
      expect(second).toEqual(first);

      const count = await prisma.subscriber.count({ where: { email } });
      expect(count).toBe(1);

      const row = await prisma.subscriber.findUnique({ where: { email } });
      expect(row?.name).toBe("First Name");
    });

    it("leaves exactly one row after concurrent duplicate subscribe attempts for the same email, both succeeding generically", async () => {
      const { useCases } = buildUseCases({ maxRequests: 10 });
      const email = "concurrent@newsletter-e2e.test";

      const [resultA, resultB] = await Promise.all([
        useCases.subscribe({
          name: "Concurrent A",
          email,
          captchaToken: "token",
          sourceKey: "e2e-source-concurrent",
        }),
        useCases.subscribe({
          name: "Concurrent B",
          email,
          captchaToken: "token",
          sourceKey: "e2e-source-concurrent",
        }),
      ]);

      expect(resultA).toEqual({ status: "subscribed" });
      expect(resultB).toEqual({ status: "subscribed" });

      const count = await prisma.subscriber.count({ where: { email } });
      expect(count).toBe(1);
    });

    it("short-circuits at the rate limiter before calling captcha or writing, once the limit is exceeded", async () => {
      const captchaVerifier = createFakeCaptchaVerifier(true);
      const { useCases } = buildUseCases({ captchaVerifier, maxRequests: 1, windowSeconds: 60 });
      const sourceKey = "e2e-source-rate-limited";

      const first = await useCases.subscribe({
        name: "Rate Limit First",
        email: "rate-limit-first@newsletter-e2e.test",
        captchaToken: "token",
        sourceKey,
      });
      expect(first).toEqual({ status: "subscribed" });
      const callsAfterFirst = captchaVerifier.verify.mock.calls.length;
      expect(callsAfterFirst).toBe(1);

      const second = await useCases.subscribe({
        name: "Rate Limit Second",
        email: "rate-limit-second@newsletter-e2e.test",
        captchaToken: "token",
        sourceKey,
      });

      expect(second.status).toBe("rate-limited");
      if (second.status !== "rate-limited") throw new Error("expected rate-limited");
      expect(second.retryAfterSeconds).toBeGreaterThan(0);

      // Captcha verifier must not have been called again for the short-circuited request.
      expect(captchaVerifier.verify.mock.calls.length).toBe(callsAfterFirst);

      const count = await prisma.subscriber.count({
        where: { email: "rate-limit-second@newsletter-e2e.test" },
      });
      expect(count).toBe(0);
    });

    it("writes no row when the captcha provider verification fails", async () => {
      const captchaVerifier = createFakeCaptchaVerifier(false);
      const { useCases } = buildUseCases({ captchaVerifier });

      const result = await useCases.subscribe({
        name: "Captcha Failure",
        email: "captcha-failure@newsletter-e2e.test",
        captchaToken: "token",
        sourceKey: "e2e-source-captcha-failure",
      });

      expect(result).toEqual({ status: "captcha-failed", reason: "provider-error" });

      const count = await prisma.subscriber.count({
        where: { email: "captcha-failure@newsletter-e2e.test" },
      });
      expect(count).toBe(0);
    });
  });

  describe("listSubscribers (admin)", () => {
    it("returns persisted rows with search, pagination and stable order against the real database", async () => {
      const { useCases } = buildUseCases();

      // Seed sequentially so createdAt ordering is deterministic.
      await useCases.subscribe({
        name: "Alice Reader",
        email: "alice@newsletter-e2e.test",
        captchaToken: "token",
        sourceKey: "e2e-source-list-alice",
      });
      await useCases.subscribe({
        name: "Bob Reader",
        email: "bob@newsletter-e2e.test",
        captchaToken: "token",
        sourceKey: "e2e-source-list-bob",
      });
      await useCases.subscribe({
        name: "Carol Example",
        email: "carol@newsletter-e2e.test",
        captchaToken: "token",
        sourceKey: "e2e-source-list-carol",
      });

      const all = await useCases.listSubscribers({ page: 1, pageSize: 20 });
      expect(all.total).toBe(3);
      // createdAt DESC -> most recently created first.
      expect(all.items.map((i) => i.email)).toEqual([
        "carol@newsletter-e2e.test",
        "bob@newsletter-e2e.test",
        "alice@newsletter-e2e.test",
      ]);
      const allowedKeys = ["id", "name", "email", "createdAt"].sort();
      for (const item of all.items) {
        expect(Object.keys(item).sort()).toEqual(allowedKeys);
      }

      const searchByName = await useCases.listSubscribers({ search: "Reader", page: 1, pageSize: 20 });
      expect(searchByName.total).toBe(2);
      expect(searchByName.items.map((i) => i.email).sort()).toEqual([
        "alice@newsletter-e2e.test",
        "bob@newsletter-e2e.test",
      ]);

      const searchByEmail = await useCases.listSubscribers({ search: "carol@", page: 1, pageSize: 20 });
      expect(searchByEmail.total).toBe(1);
      expect(searchByEmail.items[0].email).toBe("carol@newsletter-e2e.test");

      const page1 = await useCases.listSubscribers({ page: 1, pageSize: 2 });
      const page2 = await useCases.listSubscribers({ page: 2, pageSize: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(1);
      expect([...page1.items, ...page2.items].map((i) => i.email)).toEqual(all.items.map((i) => i.email));
    });
  });
});

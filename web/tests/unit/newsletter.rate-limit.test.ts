import crypto from "crypto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  createInMemoryNewsletterRateLimiter,
  hashSourceKey,
  MAX_TRACKED_SOURCES,
  SWEEP_INTERVAL_CALLS,
} from "@/modules/newsletter/infrastructure/rate-limit/in-memory-rate-limiter";
import { resolveNewsletterRateLimiterConfigFromEnv } from "@/modules/newsletter/infrastructure/rate-limit/config";

describe("hashSourceKey", () => {
  it("produces a deterministic irreversible hex digest and never returns the raw input, keyed by secret", () => {
    const secret = "test-secret-a";
    const hash = hashSourceKey("203.0.113.5", secret);

    expect(hash).not.toContain("203.0.113.5");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSourceKey("203.0.113.5", secret)).toBe(hash);
  });

  it("produces different hashes for different inputs (same secret)", () => {
    const secret = "test-secret-a";
    expect(hashSourceKey("a", secret)).not.toBe(hashSourceKey("b", secret));
  });

  it("no longer matches an unsalted sha256 of the raw source (precomputation resistance)", () => {
    const rawSource = "203.0.113.5";
    const plainSha256 = crypto.createHash("sha256").update(rawSource).digest("hex");

    expect(hashSourceKey(rawSource, "any-secret")).not.toBe(plainSha256);
  });

  it("produces different hashes for the same input under different secrets", () => {
    expect(hashSourceKey("203.0.113.5", "secret-1")).not.toBe(hashSourceKey("203.0.113.5", "secret-2"));
  });
});

describe("createInMemoryNewsletterRateLimiter: construction validation", () => {
  it("constructs successfully with a valid positive-integer config", () => {
    expect(() =>
      createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests: 5 })
    ).not.toThrow();
  });

  it.each([0, -1, 1.5, NaN])("throws fast when windowSeconds is invalid (%s)", (windowSeconds) => {
    expect(() =>
      createInMemoryNewsletterRateLimiter({ windowSeconds, maxRequests: 5 })
    ).toThrow();
  });

  it.each([0, -1, 2.5, NaN])("throws fast when maxRequests is invalid (%s)", (maxRequests) => {
    expect(() =>
      createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests })
    ).toThrow();
  });

  it("throws fast when windowSeconds exceeds the documented cap", () => {
    expect(() =>
      createInMemoryNewsletterRateLimiter({ windowSeconds: 60 * 60 * 24 * 10, maxRequests: 5 })
    ).toThrow();
  });

  it("throws fast when maxRequests exceeds the documented cap", () => {
    expect(() =>
      createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests: 1_000_000 })
    ).toThrow();
  });

  it("throws when replicaCount is greater than 1, requiring a shared store", () => {
    expect(() =>
      createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests: 5, replicaCount: 2 })
    ).toThrow(/shared store/i);
  });

  it("does not throw when replicaCount is 1 or omitted", () => {
    expect(() =>
      createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests: 5, replicaCount: 1 })
    ).not.toThrow();
  });
});

describe("createInMemoryNewsletterRateLimiter: behavior", () => {
  let currentTime: number;
  const now = () => currentTime;

  beforeEach(() => {
    currentTime = Date.UTC(2026, 0, 1, 0, 0, 0);
  });

  it("allows requests within the configured limit", async () => {
    const limiter = createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests: 5 }, { now });

    const result = await limiter.check("source-a");

    expect(result).toEqual({ allowed: true });
  });

  it("never stores the raw source identifier as (part of) the store key", async () => {
    const store = new Map<string, number[]>();
    const rawSource = "reader@example.com";
    const limiter = createInMemoryNewsletterRateLimiter(
      { windowSeconds: 600, maxRequests: 5 },
      { now, store }
    );

    await limiter.check(rawSource);

    const keys = [...store.keys()];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).not.toContain(rawSource);
    }
  });

  it("stores a key that is not a plain (unsalted) sha256 of the raw source", async () => {
    const store = new Map<string, number[]>();
    const rawSource = "203.0.113.5";
    const limiter = createInMemoryNewsletterRateLimiter(
      { windowSeconds: 600, maxRequests: 5 },
      { now, store }
    );

    await limiter.check(rawSource);

    const plainSha256 = crypto.createHash("sha256").update(rawSource).digest("hex");
    const keys = [...store.keys()];
    for (const key of keys) {
      expect(key).not.toContain(plainSha256);
    }
  });

  it("produces a deterministic store key for the same source within one limiter instance", async () => {
    const store = new Map<string, number[]>();
    const limiter = createInMemoryNewsletterRateLimiter(
      { windowSeconds: 600, maxRequests: 5 },
      { now, store }
    );

    await limiter.check("source-x");
    const firstKeys = [...store.keys()];
    await limiter.check("source-x");
    const secondKeys = [...store.keys()];

    expect(secondKeys).toEqual(firstKeys);
  });

  it("produces different store keys across limiter instances constructed with different secrets", async () => {
    const storeA = new Map<string, number[]>();
    const storeB = new Map<string, number[]>();
    const limiterA = createInMemoryNewsletterRateLimiter(
      { windowSeconds: 600, maxRequests: 5, sourceHashSecret: "secret-a" },
      { now, store: storeA }
    );
    const limiterB = createInMemoryNewsletterRateLimiter(
      { windowSeconds: 600, maxRequests: 5, sourceHashSecret: "secret-b" },
      { now, store: storeB }
    );

    await limiterA.check("source-x");
    await limiterB.check("source-x");

    expect([...storeA.keys()]).not.toEqual([...storeB.keys()]);
  });

  it("blocks the 6th request within the window and returns a correct retryAfterSeconds", async () => {
    const limiter = createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests: 5 }, { now });

    for (let i = 0; i < 5; i += 1) {
      const result = await limiter.check("source-b");
      expect(result.allowed).toBe(true);
    }

    currentTime += 60_000; // 1 minute later, still inside the 600s window
    const sixth = await limiter.check("source-b");

    expect(sixth.allowed).toBe(false);
    if (sixth.allowed) throw new Error("expected blocked result");
    // 540s left until the first request (at t=0) exits the 600s window
    expect(sixth.retryAfterSeconds).toBe(540);
  });

  it("resets the counter after the window has fully expired", async () => {
    const limiter = createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests: 5 }, { now });

    for (let i = 0; i < 5; i += 1) {
      await limiter.check("source-c");
    }
    const blocked = await limiter.check("source-c");
    expect(blocked.allowed).toBe(false);

    currentTime += 601_000; // window fully expired
    const afterExpiry = await limiter.check("source-c");

    expect(afterExpiry).toEqual({ allowed: true });
  });

  it("tracks separate sources independently", async () => {
    const limiter = createInMemoryNewsletterRateLimiter({ windowSeconds: 600, maxRequests: 1 }, { now });

    const first = await limiter.check("source-d");
    const second = await limiter.check("source-e");

    expect(first).toEqual({ allowed: true });
    expect(second).toEqual({ allowed: true });
  });
});

describe("createInMemoryNewsletterRateLimiter: bounded memory (sweep + hard cap)", () => {
  let currentTime: number;
  const now = () => currentTime;

  beforeEach(() => {
    currentTime = Date.UTC(2026, 0, 1, 0, 0, 0);
  });

  it("sweeps away stale entries once the window has expired, after enough calls to trigger a sweep", async () => {
    const store = new Map<string, number[]>();
    const limiter = createInMemoryNewsletterRateLimiter(
      { windowSeconds: 600, maxRequests: 5 },
      { now, store }
    );

    await limiter.check("source-stale");
    expect(store.size).toBe(1);

    currentTime += 601_000; // stale source's window has fully expired

    // Drive enough distinct-source calls to cross the sweep interval without
    // re-touching "source-stale" (which would otherwise refresh its timestamp).
    for (let i = 0; i < SWEEP_INTERVAL_CALLS; i += 1) {
      await limiter.check(`source-filler-${i}`);
    }

    // The stale entry (last touched before expiry) must have been swept away by
    // the sweep triggered on the SWEEP_INTERVAL_CALLS-th call, before that
    // call's own (fresh) entry was added. Only the SWEEP_INTERVAL_CALLS fresh
    // filler entries remain.
    expect(store.size).toBe(SWEEP_INTERVAL_CALLS);
  });

  it("never exceeds MAX_TRACKED_SOURCES entries under sustained key rotation", async () => {
    const store = new Map<string, number[]>();
    const limiter = createInMemoryNewsletterRateLimiter(
      { windowSeconds: 600, maxRequests: 5 },
      { now, store }
    );

    const totalDistinctSources = MAX_TRACKED_SOURCES + 500;
    for (let i = 0; i < totalDistinctSources; i += 1) {
      await limiter.check(`rotating-source-${i}`);
      expect(store.size).toBeLessThanOrEqual(MAX_TRACKED_SOURCES);
    }

    expect(store.size).toBeLessThanOrEqual(MAX_TRACKED_SOURCES);
  });
});

describe("resolveNewsletterRateLimiterConfigFromEnv", () => {
  it("returns the documented defaults (600s / 5 requests / 1 replica) when no env vars are set", () => {
    const config = resolveNewsletterRateLimiterConfigFromEnv({});

    expect(config).toEqual({ windowSeconds: 600, maxRequests: 5, replicaCount: 1 });
  });

  it("parses valid override values from raw env strings", () => {
    const config = resolveNewsletterRateLimiterConfigFromEnv({
      windowSecondsRaw: "300",
      maxRequestsRaw: "10",
      replicaCountRaw: "1",
    });

    expect(config).toEqual({ windowSeconds: 300, maxRequests: 10, replicaCount: 1 });
  });

  it("parses APP_REPLICA_COUNT > 1 and the resulting config fails limiter construction", () => {
    const config = resolveNewsletterRateLimiterConfigFromEnv({ replicaCountRaw: "2" });

    expect(config.replicaCount).toBe(2);
    expect(() => createInMemoryNewsletterRateLimiter(config)).toThrow(/shared store/i);
  });

  it("passes a non-numeric APP_REPLICA_COUNT through as NaN so construction fails fast", () => {
    // 部署守門不可被非法設定靜默繞過：只要有提供就必須是正整數。
    const config = resolveNewsletterRateLimiterConfigFromEnv({ replicaCountRaw: "two" });

    expect(Number.isNaN(config.replicaCount)).toBe(true);
    expect(() => createInMemoryNewsletterRateLimiter(config)).toThrow(/positive integer/i);
  });

  it.each(["0", "-1", "1.5"])(
    "rejects APP_REPLICA_COUNT=%s at limiter construction (must be a positive integer)",
    (raw) => {
      const config = resolveNewsletterRateLimiterConfigFromEnv({ replicaCountRaw: raw });

      expect(() => createInMemoryNewsletterRateLimiter(config)).toThrow(/positive integer/i);
    }
  );

  it("passes a non-numeric NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS through as NaN so construction fails fast", () => {
    const config = resolveNewsletterRateLimiterConfigFromEnv({ windowSecondsRaw: "not-a-number" });

    expect(Number.isNaN(config.windowSeconds)).toBe(true);
    expect(() => createInMemoryNewsletterRateLimiter(config)).toThrow();
  });

  it("passes a non-numeric NEWSLETTER_RATE_LIMIT_MAX through as NaN so construction fails fast", () => {
    const config = resolveNewsletterRateLimiterConfigFromEnv({ maxRequestsRaw: "not-a-number" });

    expect(Number.isNaN(config.maxRequests)).toBe(true);
    expect(() => createInMemoryNewsletterRateLimiter(config)).toThrow();
  });
});

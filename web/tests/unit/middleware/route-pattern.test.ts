import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { normalizeRoutePattern } from "@/lib/rate-limit-key";

// 測試路由正規化與其對 rate limit 分桶的影響
// 由於 middleware 使用 globalThis 儲存狀態，我們需要模擬這個行為（與 rate-limit.test.ts 相同作法）

describe("normalizeRoutePattern", () => {
  it("將純數字 id 片段正規化為 :id", () => {
    expect(normalizeRoutePattern("/api/posts/123")).toBe("/api/posts/:id");
    expect(normalizeRoutePattern("/api/comments/456")).toBe("/api/comments/:id");
  });

  it("將 cuid 片段正規化為 :id", () => {
    expect(normalizeRoutePattern("/api/posts/clv0abcd1234abcd5678efgh9")).toBe(
      "/api/posts/:id"
    );
  });

  it("將 uuid 片段正規化為 :id", () => {
    expect(
      normalizeRoutePattern("/api/posts/550e8400-e29b-41d4-a716-446655440000")
    ).toBe("/api/posts/:id");
  });

  it("靜態路徑維持原樣不變", () => {
    expect(normalizeRoutePattern("/api/posts")).toBe("/api/posts");
  });
});

describe("Rate Limiting with normalized route pattern", () => {
  let originalRateLimitStore: Map<string, number[]> | undefined;
  let originalLastCleanup: number | undefined;

  beforeEach(() => {
    const globalWithRateLimit = globalThis as {
      __rateLimitStore?: Map<string, number[]>;
      __lastCleanup?: number;
    };
    originalRateLimitStore = globalWithRateLimit.__rateLimitStore;
    originalLastCleanup = globalWithRateLimit.__lastCleanup;
    globalWithRateLimit.__rateLimitStore = new Map();
    globalWithRateLimit.__lastCleanup = undefined;
  });

  afterEach(() => {
    const globalWithRateLimit = globalThis as {
      __rateLimitStore?: Map<string, number[]>;
      __lastCleanup?: number;
    };
    globalWithRateLimit.__rateLimitStore = originalRateLimitStore;
    globalWithRateLimit.__lastCleanup = originalLastCleanup;
  });

  // 模擬 rate limit 邏輯（與 middleware.ts 相同）
  const apiRateLimitWindowMs = 5 * 60 * 1000;
  const apiRateLimitMax = 100;

  function getRateLimitStore(): Map<string, number[]> {
    const globalWithRateLimit = globalThis as {
      __rateLimitStore?: Map<string, number[]>;
    };
    if (!globalWithRateLimit.__rateLimitStore) {
      globalWithRateLimit.__rateLimitStore = new Map();
    }
    return globalWithRateLimit.__rateLimitStore;
  }

  function rateLimit(key: string): boolean {
    const now = Date.now();
    const windowStart = now - apiRateLimitWindowMs;
    const store = getRateLimitStore();

    const timestamps = (store.get(key) || []).filter((t) => t > windowStart);
    if (timestamps.length >= apiRateLimitMax) return false;
    timestamps.push(now);
    store.set(key, timestamps);
    return true;
  }

  it("不同 id 打向同一路由會落在同一分桶，超過限制後即被拒絕", () => {
    const ip = "192.168.1.10";
    const ids = ["1", "2", "3", "clv0abcd1234abcd5678efgh9"];

    // 以不同 id 輪流發送請求，驗證它們共用同一個 key
    const keys = ids.map(
      (id) => `${ip}:${normalizeRoutePattern(`/api/posts/${id}`)}`
    );
    expect(new Set(keys).size).toBe(1);

    const key = keys[0];

    // 累積送出 100 次請求（跨不同 id），應全部被允許
    for (let i = 0; i < apiRateLimitMax; i++) {
      const id = ids[i % ids.length];
      const requestKey = `${ip}:${normalizeRoutePattern(`/api/posts/${id}`)}`;
      expect(rateLimit(requestKey)).toBe(true);
    }

    // 第 101 次（換一個新的 id）應該被拒絕，因為累積在同一分桶
    const overLimitKey = `${ip}:${normalizeRoutePattern("/api/posts/999999")}`;
    expect(rateLimit(overLimitKey)).toBe(false);
  });

  it("不同路由（posts vs comments）各自獨立分桶，一個耗盡不影響另一個", () => {
    const ip = "192.168.1.11";
    const postsKey = `${ip}:${normalizeRoutePattern("/api/posts/1")}`;
    const commentsKey = `${ip}:${normalizeRoutePattern("/api/comments/1")}`;

    expect(postsKey).not.toBe(commentsKey);

    // 打滿 posts 分桶
    for (let i = 0; i < apiRateLimitMax; i++) {
      expect(rateLimit(postsKey)).toBe(true);
    }
    expect(rateLimit(postsKey)).toBe(false);

    // comments 分桶不受影響，仍可請求
    expect(rateLimit(commentsKey)).toBe(true);
  });
});

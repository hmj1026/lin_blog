import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 測試 rate limiting 邏輯
// 由於 middleware 使用 globalThis 儲存狀態，我們需要模擬這個行為

describe("Rate Limiting", () => {
  // 儲存原始的 globalThis 狀態
  let originalRateLimitStore: Map<string, number[]> | undefined;
  let originalLastCleanup: number | undefined;

  beforeEach(() => {
    // 備份並清除 globalThis 上的 rate limit 狀態
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
    // 恢復 globalThis 狀態
    const globalWithRateLimit = globalThis as {
      __rateLimitStore?: Map<string, number[]>;
      __lastCleanup?: number;
    };
    globalWithRateLimit.__rateLimitStore = originalRateLimitStore;
    globalWithRateLimit.__lastCleanup = originalLastCleanup;
  });

  describe("rateLimit function behavior", () => {
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

    it("允許少於限制次數的請求", () => {
      const key = "192.168.1.1:/api/posts";
      
      // 模擬 50 次請求（低於 100 限制）
      for (let i = 0; i < 50; i++) {
        expect(rateLimit(key)).toBe(true);
      }
    });

    it("在達到限制後拒絕請求", () => {
      const key = "192.168.1.2:/api/posts";
      
      // 模擬 100 次請求（達到限制）
      for (let i = 0; i < apiRateLimitMax; i++) {
        expect(rateLimit(key)).toBe(true);
      }
      
      // 第 101 次應該被拒絕
      expect(rateLimit(key)).toBe(false);
    });

    it("不同 IP 的計數互不影響", () => {
      const key1 = "192.168.1.3:/api/posts";
      const key2 = "192.168.1.4:/api/posts";
      
      // IP1 發送 100 次
      for (let i = 0; i < apiRateLimitMax; i++) {
        rateLimit(key1);
      }
      
      // IP1 被限制
      expect(rateLimit(key1)).toBe(false);
      
      // IP2 仍可請求
      expect(rateLimit(key2)).toBe(true);
    });

    it("時間窗口過期後重設計數", () => {
      const key = "192.168.1.5:/api/posts";
      const store = getRateLimitStore();
      
      // 模擬舊的時間戳（超過 5 分鐘）
      const oldTimestamp = Date.now() - apiRateLimitWindowMs - 1000;
      store.set(key, Array(apiRateLimitMax).fill(oldTimestamp));
      
      // 由於舊記錄已過期，新請求應該被允許
      expect(rateLimit(key)).toBe(true);
    });
  });
});

/**
 * Newsletter 訂閱端點專用的 process-local 限流器，實作
 * {@link NewsletterRateLimiter} port（見 design.md D4）。
 *
 * 限制（單一實例限定 / single-instance only）：
 * 計數存放於本 process 記憶體內的 `Map`，僅在單一 process 內成立。若部署改為
 * 多個 replica（水平擴展），各實例會各自計數，彼此看不到對方的請求，限流形同
 * 虛設。任何水平擴展前 SHALL 先把本 port 換成共享 store（例如 Redis），
 * 否則此限流無法提供跨實例保護。建構子會依 {@link NewsletterRateLimiterConfig.replicaCount}
 * 做最小可驗證的部署守門：`replicaCount > 1` 時直接拋出例外，避免誤在多 replica
 * 環境下靜默套用不成立的限流。
 */
import crypto from "crypto";
import { normalizeRoutePattern } from "@/lib/rate-limit-key";
import type { NewsletterRateLimiter, RateLimitCheckResult } from "../../application/ports";

/** newsletter 訂閱端點的正規化路由鍵（本限流器僅服務單一路由，故為常數） */
const ROUTE_KEY = normalizeRoutePattern("/api/newsletter/subscribe");

/** `windowSeconds` 上限（24 小時），避免設定錯誤造成永久累積或記憶體異常增長 */
export const MAX_WINDOW_SECONDS = 24 * 60 * 60;
/** `maxRequests` 上限，避免設定錯誤造成限流形同虛設 */
export const MAX_REQUESTS_CAP = 1000;
/**
 * 機會性掃描間隔（呼叫次數）。每滿此次數的 `check()` 呼叫即執行一次全表
 * 掃描，移除已完全過期的來源，防止來源輪換（例如變動 IP）造成 Map 無界成長。
 */
export const SWEEP_INTERVAL_CALLS = 100;
/**
 * 追蹤來源數的硬上限，作為掃描機制之外的縱深防禦：即使掃描尚未觸發，
 * Map 大小也不會超過此值，超過時以 FIFO 淘汰最早插入的來源。
 */
export const MAX_TRACKED_SOURCES = 10_000;

export type NewsletterRateLimiterConfig = Readonly<{
  /** 限流視窗長度（秒），對應 `NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS`，預設值由呼叫端決定 */
  windowSeconds: number;
  /** 視窗內允許的最大請求數，對應 `NEWSLETTER_RATE_LIMIT_MAX`，預設值由呼叫端決定 */
  maxRequests: number;
  /**
   * 目前部署的 process/replica 數量，對應 `APP_REPLICA_COUNT`（預設 1）。
   * 大於 1 時代表多 replica 部署，process-local 限流不成立，建構子將直接拋出例外。
   */
  replicaCount?: number;
  /**
   * 來源雜湊用的 HMAC 密鑰，對應 `NEWSLETTER_SOURCE_HASH_SECRET`。
   * 未設定時，本限流器會在建構時產生一組 per-process 隨機金鑰（見
   * {@link createInMemoryNewsletterRateLimiter}），process 重啟後金鑰即重置。
   */
  sourceHashSecret?: string;
}>;

export type NewsletterRateLimiterDeps = Readonly<{
  /** 可注入的時間來源（測試用），預設 `Date.now` */
  now?: () => number;
  /** 可注入的儲存 Map（測試用，便於檢視實際儲存的 key），預設建立新的 Map */
  store?: Map<string, number[]>;
}>;

function assertPositiveIntegerWithinCap(value: number, name: string, cap: number): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${name}: must be a positive integer, received ${String(value)}`);
  }
  if (value > cap) {
    throw new Error(`Invalid ${name}: ${value} exceeds the maximum allowed value of ${cap}`);
  }
}

/**
 * 將任意來源識別字串（例如已正規化的來源 hash、IP、email）轉換為不可逆的
 * HMAC-SHA256 十六進位摘要。即使呼叫端不慎傳入未雜湊的原始值，限流器儲存的
 * key 也不會包含原始輸入，作為縱深防禦。
 *
 * 使用 HMAC（而非未加鹽的 sha256）是刻意設計：像 IPv4 這類低熵輸入，若只用
 * 未加鹽雜湊，攻擊者可預先計算全部位址空間的雜湊值（rainbow table），
 * 反查出限流器實際追蹤的來源。以密鑰 keyed 之後，沒有密鑰就無法預先計算。
 *
 * @param secret - HMAC 密鑰。應為 {@link resolveSourceHashSecret} 產生或設定值，
 * 呼叫端不應直接傳入原始環境變數字串以外的任意值。
 */
export function hashSourceKey(rawSource: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawSource).digest("hex");
}

/**
 * 解析來源雜湊用的 HMAC 密鑰：若設定值存在則直接使用；否則產生一組
 * per-process 隨機密鑰（`crypto.randomBytes(32)`）。
 *
 * per-process 隨機金鑰是刻意可接受的設計：本限流器本身即為 process-local
 * （見檔案頂端註解），計數本就不跨 process 共享，密鑰隨 process 重啟而重置
 * 並不會削弱限流語意，只是讓同一 process 生命週期內的雜湊具一致性即可。
 */
function resolveSourceHashSecret(configuredSecret?: string): string {
  if (configuredSecret !== undefined && configuredSecret !== "") {
    return configuredSecret;
  }
  return crypto.randomBytes(32).toString("hex");
}

/**
 * 建立 newsletter 專用的 process-local 限流器。
 *
 * @throws {Error} `windowSeconds`/`maxRequests` 非正整數或超過上限時 fail fast
 * @throws {Error} `replicaCount` 有提供但非正整數時 fail fast（守門不可被非法設定繞過）
 * @throws {Error} `replicaCount > 1` 時 fail fast，要求先切換至共享 store
 */
export function createInMemoryNewsletterRateLimiter(
  config: NewsletterRateLimiterConfig,
  deps: NewsletterRateLimiterDeps = {}
): NewsletterRateLimiter {
  assertPositiveIntegerWithinCap(
    config.windowSeconds,
    "NEWSLETTER_RATE_LIMIT_WINDOW_SECONDS",
    MAX_WINDOW_SECONDS
  );
  assertPositiveIntegerWithinCap(config.maxRequests, "NEWSLETTER_RATE_LIMIT_MAX", MAX_REQUESTS_CAP);

  const replicaCount = config.replicaCount ?? 1;
  if (!Number.isInteger(replicaCount) || replicaCount <= 0) {
    throw new Error(
      `Invalid APP_REPLICA_COUNT: must be a positive integer, received ${String(replicaCount)}`
    );
  }
  if (replicaCount > 1) {
    throw new Error(
      "NewsletterRateLimiter is process-local and cannot enforce limits correctly when " +
        "APP_REPLICA_COUNT > 1; switch this port to a shared store (e.g. Redis) before " +
        "running more than one replica."
    );
  }

  const now = deps.now ?? Date.now;
  const store = deps.store ?? new Map<string, number[]>();
  const windowMs = config.windowSeconds * 1000;
  const sourceHashSecret = resolveSourceHashSecret(config.sourceHashSecret);

  let callsSinceLastSweep = 0;

  function buildStoreKey(sourceKey: string): string {
    return `${ROUTE_KEY}:${hashSourceKey(sourceKey, sourceHashSecret)}`;
  }

  /**
   * 機會性掃描：每 `SWEEP_INTERVAL_CALLS` 次呼叫執行一次，移除全部時間戳
   * 皆已超出視窗的 entry，避免來源輪換（例如變動 IP）造成 Map 無界成長。
   * 邏輯比照 `middleware.ts` 的 `cleanupRateLimitStore`；觸發狀態（呼叫計數）
   * 刻意存在 factory 內的 closure，而非模組層級/`globalThis`，避免多個
   * 限流器實例（測試中常見）互相污染彼此的掃描時機。
   */
  function sweepExpiredEntries(currentTime: number): void {
    callsSinceLastSweep += 1;
    if (callsSinceLastSweep < SWEEP_INTERVAL_CALLS) return;
    callsSinceLastSweep = 0;

    const windowStart = currentTime - windowMs;
    for (const [key, timestamps] of store.entries()) {
      const valid = timestamps.filter((timestamp) => timestamp > windowStart);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        store.set(key, valid);
      }
    }
  }

  /**
   * 縱深防禦用的硬上限：即使機會性掃描來不及執行，Map 大小也不會超過
   * `MAX_TRACKED_SOURCES`。新增一個先前不存在的 key 前，若已達上限，
   * 以 FIFO（最早插入者優先）方式淘汰一筆，為 Map 天生的插入順序迭代。
   */
  function evictOldestIfAtCapacity(key: string): void {
    if (store.has(key) || store.size < MAX_TRACKED_SOURCES) return;
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) {
      store.delete(oldestKey);
    }
  }

  return {
    async check(sourceKey: string): Promise<RateLimitCheckResult> {
      const key = buildStoreKey(sourceKey);
      const currentTime = now();

      sweepExpiredEntries(currentTime);

      const windowStart = currentTime - windowMs;
      const timestamps = (store.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

      if (timestamps.length >= config.maxRequests) {
        const oldestInWindow = timestamps[0];
        const retryAfterMs = oldestInWindow + windowMs - currentTime;
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }

      evictOldestIfAtCapacity(key);
      timestamps.push(currentTime);
      store.set(key, timestamps);
      return { allowed: true };
    },
  };
}
